import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
  pure: true,
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = Date.now();
    const diffMs = now - date.getTime();

    if (diffMs < 0) return 'ahora';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'hace un momento';
    if (minutes < 60) return `hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    if (hours < 24) return `hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    return `hace ${days} día${days !== 1 ? 's' : ''}`;
  }
}
