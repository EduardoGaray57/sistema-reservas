import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateResourceDto) {
    return this.prisma.resource.create({ data: dto });
  }

  findAll() {
    return this.prisma.resource.findMany();
  }

  async findOne(id: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new NotFoundException(`Resource with id "${id}" not found`);
    }
    return resource;
  }

  async update(id: string, dto: UpdateResourceDto) {
    await this.findOne(id); // throws NotFoundException if not found
    return this.prisma.resource.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id); // throws NotFoundException if not found
    await this.prisma.resource.delete({ where: { id } });
  }
}
