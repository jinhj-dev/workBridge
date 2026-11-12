'use client';

import { cardFrameClass } from '@/components/Card';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LEAVE_CATEGORY_CLASS } from '@/components/leave/LeaveCategoryBadge';
import { BagIcon, LeafIcon } from '@/components/leave/leaveIcons';
import { LeaveDayModal } from '@/components/leave/LeaveDayModal';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import type { Department, LeaveCalendarItem, LeaveCalendarResponse } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { shiftMonth } from '@/lib/calendar';
import { tokyoToday, toQueryString } from '@/lib/date-range';
import {
  formatDateLabel,
  itemsOnDate,
  parseCalendarDate,
  parseCalendarMonth,
} from '@/lib/leave-calendar';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';
import { useLeaveDataVersion } from '../LeaveDataVersion';
import { CalendarFilters } from './CalendarFilters';
import { DayLeaveList } from './DayLeaveList';
import type { DayListView } from './DayLeaveList';
import { LeaveScheduleTable } from './LeaveScheduleTable';
import { MonthLeaveCalendar } from './MonthLeaveCalendar';

const t = messages.leaveCalendar;
const DEBOUNCE_MS = 300;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMPTY_HOLIDAYS: ReadonlyMap<string, string> = new Map();
const cardClass = cardFrameClass;

interface CalendarParams {
  month: string;
  departmentId: string;
  name: string;
  empId: string;
  date: string; // モバイルで選んだ日(未選択は空)
  view: DayListView;
}

// SCR-004 休暇カレンダータブ。月・部署・名前・社員番号・選択日は URL Query に持つ(03 共通規則)
export function LeaveCalendarView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = tokyoToday(new Date());
  const currentMonth = today.slice(0, 7);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { version } = useLeaveDataVersion();

  const month = parseCalendarMonth(searchParams.get('month'), currentMonth);
  const rawDepartmentId = searchParams.get('departmentId') ?? '';
  const urlParams: CalendarParams = {
    month,
    departmentId: UUID_PATTERN.test(rawDepartmentId) ? rawDepartmentId : '',
    name: (searchParams.get('name') ?? '').slice(0, 100),
    empId: (searchParams.get('empId') ?? '').slice(0, 50),
    date: parseCalendarDate(searchParams.get('date'), month) ?? '',
    view: searchParams.get('view') === 'month' ? 'month' : 'day',
  };

  const [dayModal, setDayModal] = useState<{ title: string; items: LeaveCalendarItem[] } | null>(
    null,
  );

  const calendarPath = `/leaves/calendar?${toQueryString({
    month: urlParams.month,
    departmentId: urlParams.departmentId,
    name: urlParams.name.trim(),
    empId: urlParams.empId.trim(),
  })}`;
  // 月を移動する間は前の月を残す(読み込み表示に置き換えない)
  const calendar = useApiQuery<LeaveCalendarResponse>(calendarPath, { keepPreviousData: true });
  const departments = useApiQuery<Department[]>('/departments');

  // 申請が成功したら(layout が version を進める)取り直す。即時承認の申請がすぐ反映される
  const handledVersion = useRef(version);
  useEffect(() => {
    if (handledVersion.current === version) return;
    handledVersion.current = version;
    calendar.reload();
  }, [version, calendar]);

  // URL を作り直す。既定値(今月・日付なし・選択日表示)は URL に出さない
  function buildUrl(next: CalendarParams): string {
    const queryString = toQueryString({
      month: next.month === currentMonth ? '' : next.month,
      departmentId: next.departmentId,
      name: next.name,
      empId: next.empId,
      date: next.date,
      view: next.view === 'month' ? 'month' : '',
    });
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  // 選択日・表示範囲の切替は URL だけを書き換える。router.push/replace だと Next が RSC ナビゲーションを走らせ、
  // useSearchParams を使う Suspense 境界が読み込み表示に戻って画面全体が作り直されるため、
  // History API を直接使う(Next が useSearchParams へ反映する。取得済みデータはそのまま使う)
  function writeUrl(url: string, mode: 'push' | 'replace') {
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  // 名前・社員番号は入力中の値を手元に持ち、入力が止まってから URL に反映する(replace で履歴を増やさない)
  const [inputs, updateInputs] = useSyncedState(
    { name: urlParams.name, empId: urlParams.empId },
    `${urlParams.name}|${urlParams.empId}`,
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // デバウンス中に月や部署が変わっても、反映時は最新の URL 条件を使う(古い条件で巻き戻さない)
  const latestUrlParams = useRef(urlParams);
  useEffect(() => {
    latestUrlParams.current = urlParams;
  });
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  function handleSearchInput(patch: Partial<{ name: string; empId: string }>) {
    updateInputs(patch);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const merged = { ...inputs, ...patch };
    debounceTimer.current = setTimeout(() => {
      router.replace(buildUrl({ ...latestUrlParams.current, ...merged, date: '' }));
    }, DEBOUNCE_MS);
  }

  const data = calendar.data;
  const items = useMemo(() => data?.items ?? [], [data]);
  const holidays = useMemo(
    () => (data ? new Map(data.holidays.map((h) => [h.date, h.name])) : EMPTY_HOLIDAYS),
    [data],
  );
  const filtered = urlParams.departmentId !== '' || urlParams.name !== '' || urlParams.empId !== '';

  // モバイルの選択日: URL の date > 表示月に今日があれば今日 > 1 日
  const selectedDate =
    urlParams.date || (today.startsWith(month) ? today : `${month}-01`);

  function renderCalendarBody() {
    if (isDesktop === null || (calendar.status === 'loading' && !data)) {
      return <Skeleton className="h-96 rounded-lg" />;
    }
    if (calendar.status === 'error' || !data) return <SectionError onRetry={calendar.reload} />;
    return (
      <MonthLeaveCalendar
        month={month}
        items={items}
        holidays={holidays}
        today={today}
        mobile={!isDesktop}
        selectedDate={selectedDate}
        onSelectDate={(date) => writeUrl(buildUrl({ ...urlParams, date }), 'push')}
        onOpenItem={(item) =>
          setDayModal({
            title: t.dayModalTitle(item.name),
            items: [item],
          })
        }
        onOpenDate={(date) =>
          setDayModal({ title: t.dayModalTitle(formatDateLabel(date)), items: itemsOnDate(items, date) })
        }
      />
    );
  }

  const filters = (
    <CalendarFilters
      month={month}
      onMonthChange={(delta) =>
        router.push(buildUrl({ ...urlParams, month: shiftMonth(month, delta), date: '' }))
      }
      departments={departments.status === 'success' ? (departments.data ?? []) : []}
      departmentId={urlParams.departmentId}
      onDepartmentChange={(departmentId) => router.push(buildUrl({ ...urlParams, departmentId }))}
      name={inputs.name}
      empId={inputs.empId}
      onNameChange={(name) => handleSearchInput({ name })}
      onEmpIdChange={(empId) => handleSearchInput({ empId })}
      mobile={isDesktop === false}
    />
  );

  const stale = calendar.isStale;
  const calendarCard = (
    <div
      aria-busy={stale}
      className={`${cardClass} p-3 md:p-5 ${stale ? 'opacity-60 transition-opacity' : ''}`}
    >
      {renderCalendarBody()}
    </div>
  );

  const dialog = (
    <LeaveDayModal
      open={dayModal !== null}
      title={dayModal?.title ?? ''}
      items={dayModal?.items ?? []}
      onClose={() => setDayModal(null)}
    />
  );

  // 判定前(サーバー描画・hydration 中)は入れ物だけ出す
  if (isDesktop === null) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (!isDesktop) {
    const dayItems = data ? itemsOnDate(items, selectedDate) : [];
    return (
      <div className="flex flex-col gap-4">
        {filters}
        {calendarCard}
        {/* 凡例は 3 行(見出し / 休暇 / 特別休暇)の縦並び。長い文言は折り返して横にはみ出さない */}
        <ul className="flex flex-col items-start gap-1 rounded-xl bg-white/70 px-3 py-2 text-cal-note font-medium text-general-80">
          <li>{t.legend}</li>
          <li className="flex min-w-0 items-center gap-1.5">
            <span className={`flex size-4 shrink-0 items-center justify-center rounded ${LEAVE_CATEGORY_CLASS.PAID}`}>
              <span aria-hidden="true" className="size-3">
                <BagIcon />
              </span>
            </span>
            {t.legendPaid}
          </li>
          <li className="flex min-w-0 items-center gap-1.5">
            <span className={`flex size-4 shrink-0 items-center justify-center rounded ${LEAVE_CATEGORY_CLASS.SPECIAL}`}>
              <span aria-hidden="true" className="size-3">
                <LeafIcon />
              </span>
            </span>
            {t.legendSpecial}
          </li>
        </ul>
        {data ? (
          <DayLeaveList
            date={selectedDate}
            view={urlParams.view}
            items={urlParams.view === 'day' ? dayItems : items}
            filtered={filtered}
            onViewChange={(view) => writeUrl(buildUrl({ ...urlParams, view }), 'replace')}
          />
        ) : (
          <div className={`${cardClass} p-4`}>
            {calendar.status === 'error' ? (
              <SectionError onRetry={calendar.reload} />
            ) : (
              <Skeleton className="h-40 rounded-lg" />
            )}
          </div>
        )}
        {dialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {filters}
      <div className="grid items-stretch gap-4 xl:grid-cols-2 xl:gap-6">
        {calendarCard}
        <div className="relative min-h-96">
          <section
            aria-labelledby="leave-schedule-title"
            className={`${cardClass} flex h-full max-h-160 flex-col gap-3 p-5 xl:absolute xl:inset-0 xl:max-h-none`}
          >
            <h2 id="leave-schedule-title" className="flex items-baseline gap-3 text-xl/7 font-bold text-general-100">
              {t.listTitle}
              <span className="text-sm/5 font-normal text-general-80 tabular-nums">
                {messages.calendar.monthLabel(Number(month.slice(0, 4)), Number(month.slice(5, 7)))}
              </span>
            </h2>
            {data ? (
              <LeaveScheduleTable items={items} filtered={filtered} />
            ) : calendar.status === 'error' ? (
              <SectionError onRetry={calendar.reload} />
            ) : (
              <Skeleton className="h-60 rounded-lg" />
            )}
          </section>
        </div>
      </div>
      {dialog}
    </div>
  );
}
