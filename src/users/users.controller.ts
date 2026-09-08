import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  ChangeRoleDto,
  CreateUserDto,
} from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    const userDoc = await this.usersService.findById(user.id);
    if (!userDoc) return null;
    const { passwordHash, ...safeUser } = userDoc;
    return safeUser;
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  async createUser(
    @CurrentUser('id') staffId: string,
    @Body() dto: CreateUserDto,
  ) {
    const created = await this.usersService.createUser(staffId, dto);
    return {
      success: true,
      message: 'Pengguna baru berhasil ditambahkan.',
      data: created,
    };
  }

  @Roles(Role.SUPER_ADMIN)
  @Get()
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    const data = await this.usersService.listUsers(
      search,
      role,
      activeBool,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/toggle-status')
  async toggleStatus(
    @Param('id') id: string,
    @CurrentUser('id') staffId: string,
  ) {
    const updated = await this.usersService.toggleActiveStatus(id, staffId);
    const { passwordHash, ...safeUser } = updated;
    return {
      success: true,
      message: `Status pengguna berhasil diubah menjadi: ${updated.isActive ? 'AKTIF' : 'NONAKTIF'}`,
      data: safeUser,
    };
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/role')
  async changeRole(
    @Param('id') id: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    const updated = await this.usersService.changeRole(id, dto.role, staffId);
    const { passwordHash, ...safeUser } = updated;
    return {
      success: true,
      message: `Role pengguna berhasil diubah menjadi: ${updated.role}`,
      data: safeUser,
    };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(staffId, id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('bulk-delete')
  async bulkDeleteUsers(
    @CurrentUser('id') staffId: string,
    @Body('userIds') userIds: string[],
  ) {
    return this.usersService.bulkDeleteUsers(staffId, userIds);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') staffId: string,
  ) {
    return this.usersService.deleteUser(staffId, id);
  }
}
