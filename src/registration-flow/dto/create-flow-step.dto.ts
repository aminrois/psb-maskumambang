export class CreateFlowStepDto {
  stepNumber!: string;
  title!: string;
  description!: string;
  icon?: string;
  badgeColor?: string;
  isActive?: boolean;
  sortOrder?: number;
}
