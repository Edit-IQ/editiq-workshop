import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Client, Transaction, TransactionType } from '../types';

export class ExportService {
  
  // Export transactions as CSV
  static exportCSV(transactions: Transaction[], filename?: string) {
    if (transactions.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Client'];
    const rows = transactions.map(t => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.note || '',
      t.clientId || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(row => row.map(field => `"${field}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename || `EditIQ_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export clients as CSV
  static exportClientsCSV(clients: Client[], filename?: string) {
    if (clients.length === 0) {
      alert('No clients to export');
      return;
    }

    const headers = ['Name', 'Platform', 'Project Type', 'Notes', 'Created Date'];
    const rows = clients.map(c => [
      c.name,
      c.platform,
      c.projectType,
      c.notes || '',
      new Date(c.createdAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(row => row.map(field => `"${field}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename || `EditIQ_Clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export dashboard as PDF with charts
  static async exportDashboardPDF(
    transactions: Transaction[], 
    clients: Client[], 
    chartElementId: string,
    filename?: string
  ) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(37, 99, 235); // Blue color
      pdf.text('Edit IQ - Financial Dashboard', 20, 25);
      
      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
      
      // Summary Statistics
      const totalIncome = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const netProfit = totalIncome - totalExpenses;
      
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Financial Summary', 20, 50);
      
      pdf.setFontSize(11);
      pdf.text(`Total Income: ₹${totalIncome.toLocaleString()}`, 20, 60);
      pdf.text(`Total Expenses: ₹${totalExpenses.toLocaleString()}`, 20, 68);
      pdf.text(`Net Profit: ₹${netProfit.toLocaleString()}`, 20, 76);
      pdf.text(`Active Clients: ${clients.length}`, 20, 84);
      pdf.text(`Total Transactions: ${transactions.length}`, 20, 92);
      
      // Capture chart if element exists
      const chartElement = document.getElementById(chartElementId);
      if (chartElement) {
        const canvas = await html2canvas(chartElement, {
          backgroundColor: '#ffffff',
          scale: 2
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add chart to PDF
        pdf.addImage(imgData, 'PNG', 20, 105, imgWidth, Math.min(imgHeight, 100));
      }
      
      // Recent Transactions Table
      let yPosition = chartElement ? 220 : 110;
      
      pdf.setFontSize(14);
      pdf.text('Recent Transactions', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Date', 20, yPosition);
      pdf.text('Type', 50, yPosition);
      pdf.text('Category', 80, yPosition);
      pdf.text('Amount', 130, yPosition);
      pdf.text('Note', 160, yPosition);
      yPosition += 8;
      
      pdf.setTextColor(0, 0, 0);
      const recentTransactions = transactions.slice(0, 15); // Last 15 transactions
      
      recentTransactions.forEach(t => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(t.date, 20, yPosition);
        pdf.text(t.type, 50, yPosition);
        pdf.text(t.category.substring(0, 15), 80, yPosition);
        pdf.text(`₹${t.amount.toLocaleString()}`, 130, yPosition);
        pdf.text((t.note || '').substring(0, 20), 160, yPosition);
        yPosition += 6;
      });
      
      // Save PDF
      pdf.save(filename || `EditIQ_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    }
  }

  // Export all data as JSON backup
  static exportFullBackup(transactions: Transaction[], clients: Client[], filename?: string) {
    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        transactions,
        clients,
        summary: {
          totalTransactions: transactions.length,
          totalClients: clients.length,
          totalIncome: transactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0),
          totalExpenses: transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0)
        }
      }
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `EditIQ_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}