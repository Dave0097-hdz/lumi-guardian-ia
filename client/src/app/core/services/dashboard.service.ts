import { Injectable } from '@angular/core';
import {
  alertasControllerFindAll,
  alertasControllerUpdateEstado,
  bloqueosControllerCreate,
  vpsControllerFindAll,
} from '../api-client/sdk.gen';

export interface AlertaData {
  id: string;
  vpsId: string;
  vpsNombre?: string; // enriquecido desde GET /vps
  tipo: string;
  severidad: string;
  ipOrigen: string | null;
  tecnicaMitre: string | null;
  paisOrigen: string | null;
  descripcionSimple: string;
  accionTomada: string;
  estado: string;
  detectadoEn: string;
  revisadoEn: string | null;
}

export interface AlertasPaginadas {
  data: AlertaData[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface BloqueoResultado {
  id: string;
  vpsId: string;
  ip: string;
  estado: string; // "BLOQUEADO" | "FALLIDO" | "DESBLOQUEADO"
  motivo: string;
}

export interface ConteoSeveridad {
  BAJA: number;
  MEDIA: number;
  ALTA: number;
  CRITICA: number;
}

interface VpsBasico {
  id: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private vpsMap: Map<string, string> | null = null;

  /**
   * Carga la lista de VPS del usuario una sola vez y arma un Map<vpsId, nombre>.
   */
  private async cargarVpsMap(): Promise<Map<string, string>> {
    if (this.vpsMap) return this.vpsMap;

    const response = await vpsControllerFindAll();
    if (response.error) {
      this.vpsMap = new Map();
      return this.vpsMap;
    }

    const vpsList = response.data as VpsBasico[];
    this.vpsMap = new Map(vpsList.map((v) => [v.id, v.nombre]));
    return this.vpsMap;
  }

  /**
   * Obtiene alertas pendientes (estado DETECTADA) y las enriquece con el nombre del VPS.
   */
  async getAlertasPendientes(filtros?: {
    severidad?: string;
    desde?: string;
    hasta?: string;
  }): Promise<AlertasPaginadas> {
    // Cargar VPS en paralelo con las alertas
    const [vpsMap, alertasResponse] = await Promise.all([
      this.cargarVpsMap(),
      alertasControllerFindAll({
        query: {
          estado: 'DETECTADA' as never,
          limit: 100,
          page: 1,
          ...(filtros?.severidad && { severidad: filtros.severidad as never }),
          ...(filtros?.desde && { desde: filtros.desde }),
          ...(filtros?.hasta && { hasta: filtros.hasta }),
        },
      }),
    ]);

    if (alertasResponse.error) {
      throw alertasResponse.error;
    }

    const resultado = alertasResponse.data as AlertasPaginadas;

    // Enriquecer cada alerta con el nombre del VPS
    resultado.data = resultado.data.map((alerta) => ({
      ...alerta,
      vpsNombre: vpsMap.get(alerta.vpsId) ?? alerta.vpsId,
    }));

    return resultado;
  }

  /**
   * Calcula conteos por severidad a partir de las alertas DETECTADA.
   */
  calcularConteos(alertas: AlertaData[]): ConteoSeveridad {
    const conteos: ConteoSeveridad = { BAJA: 0, MEDIA: 0, ALTA: 0, CRITICA: 0 };
    for (const alerta of alertas) {
      if (alerta.severidad in conteos) {
        conteos[alerta.severidad as keyof ConteoSeveridad]++;
      }
    }
    return conteos;
  }

  /**
   * Bloquea una IP vía el backend.
   * HTTP 201 puede traer estado "BLOQUEADO" o "FALLIDO" —
   * ambos son respuestas exitosas, no excepciones.
   */
  async bloquearIp(
    vpsId: string,
    ip: string,
    motivo: string,
    alertaId: string,
  ): Promise<BloqueoResultado> {
    const response = await bloqueosControllerCreate({
      body: { vpsId, ip, motivo, alertaId },
    });

    if (response.error) {
      throw response.error;
    }

    return response.data as BloqueoResultado;
  }

  /**
   * Marca una alerta como falso positivo.
   */
  async marcarFalsoPositivo(alertaId: string): Promise<void> {
    const response = await alertasControllerUpdateEstado({
      path: { id: alertaId },
      body: { estado: 'FALSO_POSITIVO' as never },
    });

    if (response.error) {
      throw response.error;
    }
  }

  /**
   * Invalida el cache del mapa de VPS (útil si se crea/elimina un VPS).
   */
  invalidarVpsCache(): void {
    this.vpsMap = null;
  }
}
