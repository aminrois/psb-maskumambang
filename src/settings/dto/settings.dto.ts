import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  application_name?: string;

  @IsString()
  @IsOptional()
  application_short_name?: string;

  @IsString()
  @IsOptional()
  application_description?: string;

  @IsString()
  @IsOptional()
  application_logo?: string;

  @IsString()
  @IsOptional()
  application_favicon?: string;

  @IsString()
  @IsOptional()
  countdown_enabled?: string;

  @IsString()
  @IsOptional()
  countdown_title?: string;

  @IsString()
  @IsOptional()
  countdown_target_date?: string;

  @IsString()
  @IsOptional()
  countdown_ended_text?: string;

  // --- Metadata & SEO ---
  @IsString()
  @IsOptional()
  meta_title?: string;

  @IsString()
  @IsOptional()
  meta_description?: string;

  @IsString()
  @IsOptional()
  meta_keywords?: string;

  @IsString()
  @IsOptional()
  meta_author?: string;

  @IsString()
  @IsOptional()
  meta_robots?: string;

  @IsString()
  @IsOptional()
  canonical_url?: string;

  // --- Open Graph & Social Media ---
  @IsString()
  @IsOptional()
  og_title?: string;

  @IsString()
  @IsOptional()
  og_description?: string;

  @IsString()
  @IsOptional()
  og_image?: string;

  @IsString()
  @IsOptional()
  og_type?: string;

  // --- Twitter / X Cards ---
  @IsString()
  @IsOptional()
  twitter_card?: string;

  @IsString()
  @IsOptional()
  twitter_title?: string;

  @IsString()
  @IsOptional()
  twitter_description?: string;

  @IsString()
  @IsOptional()
  twitter_image?: string;

  // --- Google Search Console & Analytics ---
  @IsString()
  @IsOptional()
  google_site_verification?: string;

  @IsString()
  @IsOptional()
  google_analytics_id?: string;

  @IsString()
  @IsOptional()
  google_tag_manager_id?: string;

  // --- Advanced Custom Scripts & Header Tags ---
  @IsString()
  @IsOptional()
  custom_head_scripts?: string;

  @IsString()
  @IsOptional()
  custom_body_scripts?: string;
}

export class ResetOperationalDataDto {
  @IsString()
  @IsNotEmpty({ message: 'Kode konfirmasi wajib diisi.' })
  confirmationCode!: string;
}
