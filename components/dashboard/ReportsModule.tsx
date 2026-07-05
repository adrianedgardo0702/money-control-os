'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FileSpreadsheet, Filter, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStore } from '@/store/useStore';

export type ReportType = 'Mensual' | 'Semanal' | 'Diario' | 'General' | 'Negocio';

interface Report {
  id: string;
  title: string;
  type: ReportType;
  date: string;
  status: 'Generado';
}

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ReportsModule() {
  const { accounts, transactions, protectedFunds, debts, businesses } = useStore();
  const [history, setHistory] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('Mensual');

  const totalMoney = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const protectedMoney = protectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
  const safeFreeMoney = totalMoney - protectedMoney;
  const totalIncome = transactions.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalExpenses = transactions.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.pending), 0);

  const businessRows = businesses.map((business) => {
    const businessTxs = transactions.filter((transaction) => transaction.business_id === business.id);
    const income = businessTxs.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expenses = businessTxs.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    return [business.name, money(income), money(expenses), money(income - expenses)];
  });

  const generatePDF = () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.setTextColor(33, 37, 41);
      doc.text('Noa Finanzas', 14, 20);

      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text(`Reporte financiero ${reportType}`, 14, 30);

      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-PA')}`, 14, 38);

      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text('Resumen ejecutivo', 14, 52);

      doc.setFontSize(11);
      doc.setTextColor(60);
      const summaryLines = doc.splitTextToSize(
        `Dinero total: ${money(totalMoney)}. Dinero No Tocar: ${money(protectedMoney)}. Libre seguro: ${money(safeFreeMoney)}. Ingresos registrados: ${money(totalIncome)}. Gastos registrados: ${money(totalExpenses)}. Deudas pendientes: ${money(totalDebt)}.`,
        180
      );
      doc.text(summaryLines, 14, 60);

      let y = 60 + summaryLines.length * 5 + 10;
      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text('Estado de flujo de caja', 14, y);

      autoTable(doc, {
        startY: y + 5,
        head: [['Concepto', 'Monto']],
        body: [
          ['Dinero total', money(totalMoney)],
          ['Dinero No Tocar', money(protectedMoney)],
          ['Dinero libre seguro', money(safeFreeMoney)],
          ['Deudas pendientes', money(totalDebt)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Ingresos y gastos por negocio', 14, y);

      autoTable(doc, {
        startY: y + 5,
        head: [['Negocio', 'Ingresos', 'Gastos', 'Neto']],
        body: businessRows.length > 0 ? businessRows : [['Sin negocios', money(0), money(0), money(0)]],
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Reservas protegidas', 14, y);

      autoTable(doc, {
        startY: y + 5,
        head: [['Reserva', 'Tipo', 'Prioridad', 'Monto']],
        body: protectedFunds.length > 0
          ? protectedFunds.map((fund) => [fund.name, fund.fund_type, fund.priority, money(Number(fund.amount))])
          : [['Sin reservas', '-', '-', money(0)]],
        theme: 'grid',
      });

      doc.save(`Reporte_Financiero_${reportType}_${Date.now()}.pdf`);

      setHistory((current) => [{
        id: Date.now().toString(),
        title: `Reporte ${reportType}`,
        type: reportType,
        date: new Date().toISOString().split('T')[0],
        status: 'Generado',
      }, ...current]);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSV = () => {
    const rows = [
      ['Concepto', 'Monto'],
      ['Dinero Total', String(totalMoney)],
      ['Dinero No Tocar', String(protectedMoney)],
      ['Dinero Libre Seguro', String(safeFreeMoney)],
      ['Ingresos Registrados', String(totalIncome)],
      ['Gastos Registrados', String(totalExpenses)],
      ['Deudas Pendientes', String(totalDebt)],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Exportacion_Financiera_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto h-full max-w-6xl space-y-5 overflow-y-auto pb-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold md:text-3xl">Reportes Financieros</h2>
          <p className="text-muted-foreground mt-1">Genera y descarga informes detallados en PDF y CSV.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 rounded-2xl border-border/50 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Generar nuevo reporte</CardTitle>
            <CardDescription>Configura los parametros del informe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de reporte</label>
              <div className="grid grid-cols-2 gap-2">
                {['Mensual', 'Semanal', 'Diario', 'General'].map((type) => (
                  <Button
                    key={type}
                    variant={reportType === type ? 'default' : 'outline'}
                    className="w-full text-xs h-9"
                    onClick={() => setReportType(type as ReportType)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-xl space-y-3 mt-4 border border-border/50">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Se incluira en el reporte:
              </h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>Resumen ejecutivo de flujo</li>
                <li>Dinero No Tocar vs Dinero libre</li>
                <li>Ingresos y gastos por negocio</li>
                <li>Estado de deudas</li>
                <li>Reservas protegidas</li>
              </ul>
            </div>
          </CardContent>
          <div className="p-6 pt-0 space-y-3 mt-auto">
            <Button className="w-full rounded-xl gap-2 font-semibold" onClick={generatePDF} disabled={isGenerating}>
              {isGenerating ? 'Generando PDF...' : <><FileText className="w-4 h-4" /> Descargar PDF</>}
            </Button>
            <Button variant="outline" className="w-full rounded-xl gap-2" onClick={generateCSV}>
              <FileSpreadsheet className="w-4 h-4 text-success" />
              Exportar CSV
            </Button>
          </div>
        </Card>

        <Card className="md:col-span-2 rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Historial de reportes</CardTitle>
              <CardDescription>Reportes generados en esta sesion.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{report.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {report.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Generado</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {history.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Todavia no has generado reportes en esta sesion.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
