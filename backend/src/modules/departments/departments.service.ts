import { Injectable } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentsRepository: DepartmentsRepository) {}

  list(): Promise<{ id: string; name: string }[]> {
    return this.departmentsRepository.findAll();
  }
}
