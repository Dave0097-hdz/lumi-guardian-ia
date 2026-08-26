import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.configurarTransport();
  }

  /**
   * Envía correo de bienvenida al registrarse.
   */
  async enviarBienvenida(email: string, nombre: string): Promise<void> {
    const html = this.cargarTemplate('bienvenida', { nombre });
    const text = this.cargarTextoPlano('bienvenida', { nombre });

    await this.enviar({
      to: email,
      subject: '¡Bienvenido a LUMI Guardián AI!',
      html,
      text,
    });
  }

  /**
   * Envía correo con link para recuperar contraseña.
   */
  async enviarRecuperarPassword(
    email: string,
    nombre: string,
    resetUrl: string,
  ): Promise<void> {
    const html = this.cargarTemplate('recuperar-password', { nombre, resetUrl });
    const text = this.cargarTextoPlano('recuperar-password', { nombre, resetUrl });

    await this.enviar({
      to: email,
      subject: 'Recupera tu contraseña — LUMI Guardián AI',
      html,
      text,
    });
  }

  /**
   * Envía correo de alerta cuando se detecta una amenaza en un VPS.
   */
  async enviarAlertaVps(
    email: string,
    nombre: string,
    alerta: {
      tipo: string;
      severidad: string;
      ipOrigen: string | null;
      descripcionSimple: string;
      vpsNombre: string;
    },
  ): Promise<void> {
    const html = this.cargarTemplate('alerta-vps', { nombre, ...alerta });
    const text = this.cargarTextoPlano('alerta-vps', { nombre, ...alerta });

    await this.enviar({
      to: email,
      subject: `⚠️ Alerta de seguridad en ${alerta.vpsNombre} — LUMI`,
      html,
      text,
    });
  }

  // ─── PRIVADOS ────────────────────────────────

  private configurarTransport(): void {
    const host = this.config.get<string>('smtp.host');
    const port = this.config.get<number>('smtp.port');
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.password');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP no configurado — los correos no se enviarán.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: port ?? 587,
      secure: this.config.get<boolean>('smtp.secure') ?? false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    this.logger.log(`Mail transport configurado: ${host}:${port}`);
  }

  private async enviar(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Mail no enviado (SMTP no configurado): ${options.subject} → ${options.to}`);
      return;
    }

    try {
      const fromName = this.config.get<string>('smtp.fromName') ?? 'LUMI Guardián AI';
      const fromEmail = this.config.get<string>('smtp.fromEmail') ?? 'noreply@lumi.io';

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Mail enviado: ${options.subject} → ${options.to}`);
    } catch (error) {
      this.logger.error(`Error enviando mail a ${options.to}: ${error}`);
      // No propaga — un fallo de email no debe tumbar la operación principal
    }
  }

  private cargarTemplate(nombre: string, variables: Record<string, unknown>): string {
    try {
      const templatePath = path.join(process.cwd(), 'src', 'mail', 'templates', `${nombre}.hbs`);
      const source = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(source);
      return template(variables);
    } catch (error) {
      this.logger.error(`Error cargando template ${nombre}: ${error}`);
      return '';
    }
  }

  private cargarTextoPlano(nombre: string, variables: Record<string, unknown>): string {
    try {
      const templatePath = path.join(process.cwd(), 'src', 'mail', 'templates', `${nombre}.txt.hbs`);
      const source = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(source);
      return template(variables);
    } catch {
      return `LUMI Guardián AI — ${nombre}`;
    }
  }
}
