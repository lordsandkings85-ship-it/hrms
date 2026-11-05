import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.project.findMany({ where: { companyId }, include: { tasks: true } });
  }

  create(companyId: string, name: string) {
    return this.prisma.project.create({ data: { companyId, name } });
  }

  /**
   * Resolves a project the caller is allowed to touch. Group-wide
   * administrators may reach any project; everyone else is limited to their
   * own company. A foreign id is reported as not-found so ids cannot be
   * enumerated across tenants.
   */
  private async accessibleProject(projectId: string, companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const project = await this.prisma.project.findFirst({
      where: groupWide ? { id: projectId } : { id: projectId, companyId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async addTask(projectId: string, companyId: string, title: string, userId?: string) {
    await this.accessibleProject(projectId, companyId, userId);
    return this.prisma.task.create({ data: { projectId, title } });
  }

  async updateTaskStatus(taskId: string, companyId: string, status: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const task = await this.prisma.task.findFirst({
      where: groupWide ? { id: taskId } : { id: taskId, project: { companyId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({ where: { id: taskId }, data: { status } });
  }
}
