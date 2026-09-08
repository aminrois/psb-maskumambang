import { Injectable, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const idnAreaData = require('idn-area-data');

export interface WilayahItem {
  code: string;
  name: string;
}

@Injectable()
export class WilayahService implements OnModuleInit {
  private provincesCache: WilayahItem[] = [];
  private regenciesCache: { code: string; province_code: string; name: string }[] = [];
  private districtsCache: { code: string; regency_code: string; name: string }[] = [];
  private villagesCache: { code: string; district_code: string; name: string }[] = [];
  private isLoaded = false;

  async onModuleInit() {
    await this.loadAllData();
  }

  private async loadAllData() {
    if (this.isLoaded) return;
    try {
      const [provinces, regencies, districts, villages] = await Promise.all([
        idnAreaData.getProvinces(),
        idnAreaData.getRegencies(),
        idnAreaData.getDistricts(),
        idnAreaData.getVillages(),
      ]);

      this.provincesCache = (provinces || []).map((p: any) => ({
        code: p.code,
        name: this.toTitleCase(p.name),
      }));

      this.regenciesCache = regencies || [];
      this.districtsCache = districts || [];
      this.villagesCache = villages || [];
      this.isLoaded = true;
    } catch (err) {
      console.error('Failed to pre-load wilayah data:', err);
    }
  }

  /**
   * Returns all 38 provinces of Indonesia.
   */
  async getProvinces(): Promise<WilayahItem[]> {
    if (!this.isLoaded) await this.loadAllData();
    return this.provincesCache;
  }

  /**
   * Returns regencies (kab/kota) for a given province code.
   */
  async getRegencies(provinceCode: string): Promise<WilayahItem[]> {
    if (!this.isLoaded) await this.loadAllData();
    if (!provinceCode) return [];
    const cleanProv = provinceCode.trim();
    const filtered = this.regenciesCache.filter(
      (r) => r.province_code === cleanProv || r.province_code === cleanProv.replace(/\./g, ''),
    );
    return filtered.map((r) => ({
      code: r.code,
      name: this.toTitleCase(r.name),
    }));
  }

  /**
   * Returns districts (kecamatan) for a given regency code.
   */
  async getDistricts(regencyCode: string): Promise<WilayahItem[]> {
    if (!this.isLoaded) await this.loadAllData();
    if (!regencyCode) return [];
    const cleanReg = regencyCode.trim();
    const cleanRegNoDot = cleanReg.replace(/\./g, '');
    const filtered = this.districtsCache.filter(
      (d) =>
        d.regency_code === cleanReg ||
        d.regency_code.replace(/\./g, '') === cleanRegNoDot,
    );
    return filtered.map((d) => ({
      code: d.code,
      name: this.toTitleCase(d.name),
    }));
  }

  /**
   * Returns villages (desa/kelurahan) for a given district code.
   */
  async getVillages(districtCode: string): Promise<WilayahItem[]> {
    if (!this.isLoaded) await this.loadAllData();
    if (!districtCode) return [];
    const cleanDist = districtCode.trim();
    const cleanDistNoDot = cleanDist.replace(/\./g, '');
    const filtered = this.villagesCache.filter(
      (v) =>
        v.district_code === cleanDist ||
        v.district_code.replace(/\./g, '') === cleanDistNoDot,
    );
    return filtered.map((v) => ({
      code: v.code,
      name: this.toTitleCase(v.name),
    }));
  }

  /**
   * Converts UPPERCASE names to Title Case for nicer display.
   */
  private toTitleCase(str: string): string {
    if (!str) return str;
    return str
      .toLowerCase()
      .replace(/(?:^|\s|[-\/])(\S)/g, (match) => match.toUpperCase());
  }
}
