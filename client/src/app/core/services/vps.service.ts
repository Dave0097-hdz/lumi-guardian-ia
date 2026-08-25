import { Injectable } from '@angular/core';
import {
  vpsControllerFindAll,
  vpsControllerFindOne,
  vpsControllerCreate,
  vpsControllerRemove,
  vpsControllerRegenerateToken,
  configuracionControllerFindByVps,
  configuracionControllerUpdate,
} from '../api-client/sdk.gen';

export interface VpsData {
  id: string;
  nombre: string;
  ip: string;
  sistemaOperativo: string;
  proveedor: string;
  estado: string;
  agenteVersion: string | null;
  ultimoHeartbeat: string | null;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VpsCreateResult {
  vps: VpsData;
  agentToken: string;
  installScript: string;
}

export interface VpsConfiguracion {
  id: string;
  vpsId: string;
  nivelAutonomia: string;
  notifEmail: boolean;
  notifDashboard: boolean;
  severidadesNotif: string[];
  umbralCpuAlerta: number;
  umbralRamAlerta: number;
  updatedAt: string;
}

export interface UpdateConfigDto {
  nivelAutonomia?: string;
  notifEmail?: boolean;
  notifDashboard?: boolean;
  umbralCpuAlerta?: number;
  umbralRamAlerta?: number;
}

@Injectable({ providedIn: 'root' })
export class VpsService {
  async getAll(): Promise<VpsData[]> {
    const response = await vpsControllerFindAll();
    if (response.error) throw response.error;
    return response.data as VpsData[];
  }

  async getOne(id: string): Promise<VpsData> {
    const response = await vpsControllerFindOne({ path: { id } });
    if (response.error) throw response.error;
    return response.data as VpsData;
  }

  async create(dto: {
    nombre: string;
    ip: string;
    sistemaOperativo: string;
    proveedor: 'DIGITAL_OCEAN' | 'AWS' | 'LINODE' | 'OTRO';
    descripcion?: string;
  }): Promise<VpsCreateResult> {
    const response = await vpsControllerCreate({ body: dto });
    if (response.error) throw response.error;
    return response.data as VpsCreateResult;
  }

  async delete(id: string): Promise<void> {
    const response = await vpsControllerRemove({ path: { id } });
    if (response.error) throw response.error;
  }

  async regenerateToken(id: string): Promise<{ agentToken: string; installScript: string }> {
    const response = await vpsControllerRegenerateToken({ path: { id } });
    if (response.error) throw response.error;
    return response.data as { agentToken: string; installScript: string };
  }

  async getConfiguracion(id: string): Promise<VpsConfiguracion> {
    const response = await configuracionControllerFindByVps({ path: { id } });
    if (response.error) throw response.error;
    return response.data as VpsConfiguracion;
  }

  async updateConfiguracion(id: string, dto: UpdateConfigDto): Promise<VpsConfiguracion> {
    const response = await configuracionControllerUpdate({
      path: { id },
      body: dto as never,
    });
    if (response.error) throw response.error;
    return response.data as VpsConfiguracion;
  }
}
