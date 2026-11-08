import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { Page } from '../../common/pagination/pagination.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { leaveBalanceQuerySchema } from './dto/leave-balance-query.dto.js';
import type { LeaveBalanceQueryDto } from './dto/leave-balance-query.dto.js';
import { pendingApprovalQuerySchema } from './dto/pending-approval-query.dto.js';
import type { PendingApprovalQueryDto } from './dto/pending-approval-query.dto.js';
import { rejectLeaveSchema } from './dto/reject-leave.dto.js';
import type { RejectLeaveDto } from './dto/reject-leave.dto.js';
import type { LeaveBalance } from './leave-rules.js';
import type { LeaveResponse } from './leave.mapper.js';
import { LeavesService } from './leaves.service.js';

// 固定パス(balance, pending-approval)は :id より先に宣言する
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get('balance')
  getBalance(
    @CurrentUser() user: AuthUser,
    @Query({ schema: leaveBalanceQuerySchema }) query: LeaveBalanceQueryDto,
  ): Promise<LeaveBalance> {
    return this.leavesService.getBalance(user.id, query.year);
  }

  @Get('pending-approval')
  listPendingApproval(
    @CurrentUser() user: AuthUser,
    @Query({ schema: pendingApprovalQuerySchema }) query: PendingApprovalQueryDto,
  ): Promise<Page<LeaveResponse>> {
    return this.leavesService.listPendingApproval(user, query);
  }

  @Get(':id')
  getDetail(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<LeaveResponse> {
    return this.leavesService.getDetail(user, id);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<LeaveResponse> {
    return this.leavesService.approve(user, id);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: rejectLeaveSchema }) dto: RejectLeaveDto,
  ): Promise<LeaveResponse> {
    return this.leavesService.reject(user, id, dto.rejectReason);
  }
}
