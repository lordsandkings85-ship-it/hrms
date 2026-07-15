import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}
  list(companyId: string) {
    return this.prisma.project.findMany({ where: { companyId }, include: { tasks: true } });
  }
  create(companyId: string, name: string) {
    return this.prisma.project.create({ data: { companyId, name } });
  }
  addTask(projectId: string, title: string) {
    return this.prisma.task.create({ data: { projectId, title } });
  }
  updateTaskStatus(taskId: string, status: string) {
    return this.prisma.task.update({ where: { id: taskId }, data: { status } });
  }
}
