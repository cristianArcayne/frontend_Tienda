import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReporteRespuesta } from '../../../models/reportes/reporte-respuesta.model';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = pdfFonts.pdfMake ? (pdfMake as any).vfs : pdfFonts;

@Component({
  selector: 'app-reporte-export',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './reporte-export.html',
  styleUrl: './reporte-export.scss'
})
export class ReporteExportComponent {
  @Input() resultados: ReporteRespuesta | null = null;
  @Input() nombreReporte = 'reporte';

  constructor(private snackBar: MatSnackBar) {}

  exportarExcel(): void {
    if (!this.resultados?.datos?.length) return;

    const data = this.resultados.datos;
    const ws = XLSX.utils.json_to_sheet(data);

    const colWidths = Object.keys(data[0]).map(k => ({
      wch: Math.max(k.length, 12)
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

    const fileName = `${this.nombreReporte}-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.snackBar.open(`Excel exportado: ${fileName}`, 'OK', { duration: 3000 });
  }

  exportarPDF(): void {
    if (!this.resultados?.datos?.length) return;

    const data = this.resultados.datos;
    const columnas = Object.keys(data[0]);

    const header = columnas.map(c => ({ text: c, style: 'tableHeader', alignment: 'left' as const }));
    const body: any[][] = [header];

    data.forEach(row => {
      body.push(columnas.map(c => String(row[c] ?? '')));
    });

    const docDefinition = {
      pageSize: 'A4' as const,
      pageOrientation: 'landscape' as const,
      content: [
        { text: this.nombreReporte.replace(/-/g, ' ').toUpperCase(), style: 'title' },
        { text: `Total registros: ${this.resultados.paginacion.total_registros}`, margin: [0, 0, 0, 12] },
        {
          table: {
            headerRows: 1,
            widths: columnas.map(() => '*'),
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
        tableHeader: { bold: true, fontSize: 9, fillColor: '#f5f5f5' },
      },
      defaultStyle: { fontSize: 8 },
    };

    const fileName = `${this.nombreReporte}-${Date.now()}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);

    this.snackBar.open(`PDF exportado: ${fileName}`, 'OK', { duration: 3000 });
  }
}
