import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Client, Transaction, TransactionType } from '../types';

// Workspace Task interface for PDF export
interface WorkspaceTask {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: 'PENDING' | 'WORKING' | 'COMPLETED';
  dueDate: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export class ExportService {
  
  // Export transactions as CSV (Mobile App Compatible)
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
    
    // Check if we're in a mobile app environment
    const isMobileApp = window.navigator.userAgent.includes('wv') || 
                       window.location.protocol === 'file:' ||
                       !window.open;
    
    if (isMobileApp) {
      // For mobile apps, try to share or copy to clipboard
      if (navigator.share) {
        const blob = new Blob([csvContent.replace('data:text/csv;charset=utf-8,', '')], { type: 'text/csv' });
        const file = new File([blob], filename || `EditIQ_Transactions_${new Date().toISOString().split('T')[0]}.csv`, { type: 'text/csv' });
        navigator.share({ files: [file] }).catch(() => {
          // Fallback to clipboard
          navigator.clipboard.writeText(csvContent.replace('data:text/csv;charset=utf-8,', ''))
            .then(() => alert('CSV data copied to clipboard'))
            .catch(() => alert('Export not supported in this environment'));
        });
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(csvContent.replace('data:text/csv;charset=utf-8,', ''))
          .then(() => alert('CSV data copied to clipboard'))
          .catch(() => alert('Export not supported in this environment'));
      }
    } else {
      // Standard web download
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename || `EditIQ_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
      
      // Title - compact
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0); // Black for better visibility
      pdf.text('EditIQ - Financial Dashboard', 20, 20);
      
      // Date - compact
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 28);
      
      // Summary Statistics - more compact
      const totalIncome = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const netProfit = totalIncome - totalExpenses;
      
      // Section header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Financial Summary', 20, 40);
      
      // Summary data - compact layout
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      
      let yPos = 48;
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Total Income: ₹${totalIncome.toLocaleString('en-IN')}`, 20, yPos);
      yPos += 6;
      pdf.text(`Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}`, 20, yPos);
      yPos += 6;
      pdf.text(`Net Profit: ₹${netProfit.toLocaleString('en-IN')}`, 20, yPos);
      yPos += 6;
      pdf.text(`Active Clients: ${clients.length}`, 20, yPos);
      yPos += 6;
      pdf.text(`Total Transactions: ${transactions.length}`, 20, yPos);
      
      // Capture chart with better quality but smaller size
      const chartElement = document.getElementById(chartElementId);
      if (chartElement) {
        const canvas = await html2canvas(chartElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add chart - more compact
        pdf.addImage(imgData, 'PNG', 20, 80, imgWidth, Math.min(imgHeight, 60));
      }
      
      // Recent Transactions Table - compact
      let yPosition = chartElement ? 150 : 85;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Recent Transactions', 20, yPosition);
      yPosition += 8;
      
      // Table headers - compact
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      
      pdf.text('Date', 20, yPosition);
      pdf.text('Type', 45, yPosition);
      pdf.text('Category', 70, yPosition);
      pdf.text('Amount', 120, yPosition);
      pdf.text('Note', 155, yPosition);
      yPosition += 5;
      
      // Table data - very compact
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 25); // More transactions in compact format
      
      recentTransactions.forEach((t, index) => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setTextColor(0, 0, 0);
        
        // Compact date format
        pdf.text(new Date(t.date).toLocaleDateString('en-GB'), 20, yPosition);
        
        // Transaction type with color
        if (t.type === TransactionType.INCOME) {
          pdf.setTextColor(0, 150, 0); // Dark green
        } else {
          pdf.setTextColor(200, 0, 0); // Dark red
        }
        pdf.text(t.type, 45, yPosition);
        
        pdf.setTextColor(0, 0, 0);
        pdf.text(t.category.substring(0, 20), 70, yPosition);
        
        // Amount
        pdf.text(`₹${t.amount.toLocaleString('en-IN')}`, 120, yPosition);
        
        // Note
        pdf.text((t.note || '').substring(0, 15), 155, yPosition);
        yPosition += 4; // Very compact spacing
      });
      
      // Footer - compact
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`EditIQ Dashboard - ${new Date().toLocaleDateString()}`, 20, pageHeight - 8);
      
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

  // Export combined workspace and financial report as PDF
  static async exportCombinedReportPDF(
    tasks: WorkspaceTask[],
    clients: Client[],
    transactions: Transaction[],
    userId: string,
    chartElementId?: string,
    filename?: string
  ) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header with gradient effect simulation
      pdf.setFillColor(2, 6, 23); // Dark blue background
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      // Add logo from Cloudinary with better error handling
      try {
        const logoResponse = await fetch('https://res.cloudinary.com/dvd6oa63p/image/upload/v1768175554/workspacebgpng_zytu0b.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          
          // Add logo (top-left, 20x20mm)
          pdf.addImage(logoDataUrl, 'PNG', 15, 10, 20, 20);
        }
      } catch (error) {
        console.warn('Could not load logo:', error);
        // Add a simple text logo as fallback
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.text('EditIQ', 20, 25);
      }
      
      // Title with modern styling
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255); // White text
      pdf.text('EditIQ - Complete Report', 45, 25);
      
      // Subtitle
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(148, 163, 184); // Light gray
      pdf.text('Financial Dashboard & Project Workspace', 45, 32);
      
      // Report info
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generated: ${new Date().toLocaleString()} | Workspace: ${userId.slice(-8)}`, 45, 38);
      
      // Reset colors for content
      pdf.setTextColor(0, 0, 0);
      
      let yPos = 55;
      
      // ===== FINANCIAL SECTION =====
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(59, 130, 246); // Blue color
      pdf.text('Financial Dashboard', 20, yPos);
      yPos += 15;
      
      // Financial Statistics
      const totalIncome = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const netProfit = totalIncome - totalExpenses;
      
      // Financial Summary Cards
      const finCardWidth = 42;
      const finCardHeight = 20;
      const finCardSpacing = 47;
      
      const finCards = [
        { label: 'Total Income', value: `Rs ${totalIncome.toLocaleString('en-IN')}`, color: [16, 185, 129] },
        { label: 'Total Expenses', value: `Rs ${totalExpenses.toLocaleString('en-IN')}`, color: [239, 68, 68] },
        { label: 'Net Profit', value: `Rs ${netProfit.toLocaleString('en-IN')}`, color: [59, 130, 246] },
        { label: 'Transactions', value: transactions.length.toString(), color: [100, 116, 139] }
      ];
      
      finCards.forEach((card, index) => {
        const x = 20 + (index * finCardSpacing);
        
        // Card background
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, yPos, finCardWidth, finCardHeight, 2, 2, 'F');
        
        // Card border
        pdf.setDrawColor(...card.color);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(x, yPos, finCardWidth, finCardHeight, 2, 2, 'S');
        
        // Value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...card.color);
        pdf.text(card.value, x + finCardWidth/2, yPos + 8, { align: 'center' });
        
        // Label
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(71, 85, 105);
        pdf.text(card.label, x + finCardWidth/2, yPos + 14, { align: 'center' });
      });
      
      yPos += 30;
      
      // Recent Transactions Table
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Recent Transactions', 20, yPos);
      yPos += 8;
      
      // Transaction table header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(15, yPos - 3, pageWidth - 30, 8, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text('DATE', 20, yPos + 2);
      pdf.text('TYPE', 50, yPos + 2);
      pdf.text('CATEGORY', 75, yPos + 2);
      pdf.text('AMOUNT', 130, yPos + 2);
      pdf.text('NOTE', 160, yPos + 2);
      
      yPos += 8;
      
      // Recent transactions (limit to 8)
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);
      
      recentTransactions.forEach((t, index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(15, yPos - 2, pageWidth - 30, 6, 'F');
        }
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0);
        
        pdf.text(new Date(t.date).toLocaleDateString('en-GB'), 20, yPos + 1);
        
        // Type with color
        if (t.type === TransactionType.INCOME) {
          pdf.setTextColor(16, 185, 129);
        } else {
          pdf.setTextColor(239, 68, 68);
        }
        pdf.text(t.type, 50, yPos + 1);
        
        pdf.setTextColor(0, 0, 0);
        pdf.text(t.category.substring(0, 15), 75, yPos + 1);
        pdf.text(`Rs ${t.amount.toLocaleString('en-IN')}`, 130, yPos + 1);
        pdf.text((t.note || '').substring(0, 12), 160, yPos + 1);
        
        yPos += 6;
      });
      
      yPos += 10;
      
      // ===== PROJECT WORKSPACE SECTION =====
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 30;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(16, 185, 129); // Green color
      pdf.text('Project Workspace', 20, yPos);
      yPos += 15;
      
      // Project Statistics
      const projectStats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        working: tasks.filter(t => t.status === 'WORKING').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length
      };
      
      // Project Cards
      const projCards = [
        { label: 'Total Projects', value: projectStats.total, color: [100, 116, 139] },
        { label: 'Pending', value: projectStats.pending, color: [245, 158, 11] },
        { label: 'In Progress', value: projectStats.working, color: [59, 130, 246] },
        { label: 'Completed', value: projectStats.completed, color: [16, 185, 129] }
      ];
      
      projCards.forEach((card, index) => {
        const x = 20 + (index * finCardSpacing);
        
        // Card background
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, yPos, finCardWidth, finCardHeight, 2, 2, 'F');
        
        // Card border
        pdf.setDrawColor(...card.color);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(x, yPos, finCardWidth, finCardHeight, 2, 2, 'S');
        
        // Value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...card.color);
        pdf.text(card.value.toString(), x + finCardWidth/2, yPos + 8, { align: 'center' });
        
        // Label
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(71, 85, 105);
        pdf.text(card.label, x + finCardWidth/2, yPos + 14, { align: 'center' });
      });
      
      yPos += 30;
      
      // Project Details Table
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Project Details', 20, yPos);
      yPos += 8;
      
      // Project table header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(15, yPos - 3, pageWidth - 30, 8, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text('CLIENT', 20, yPos + 2);
      pdf.text('PROJECT', 60, yPos + 2);
      pdf.text('STATUS', 120, yPos + 2);
      pdf.text('DUE DATE', 150, yPos + 2);
      
      yPos += 8;
      
      // Project rows (limit to fit page)
      const sortedTasks = tasks.sort((a, b) => b.createdAt - a.createdAt);
      const maxTasks = Math.min(sortedTasks.length, 10);
      
      for (let i = 0; i < maxTasks; i++) {
        const task = sortedTasks[i];
        
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 30;
          
          // Re-add table header on new page
          pdf.setFillColor(241, 245, 249);
          pdf.rect(15, yPos - 3, pageWidth - 30, 8, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(51, 65, 85);
          pdf.text('CLIENT', 20, yPos + 2);
          pdf.text('PROJECT', 60, yPos + 2);
          pdf.text('STATUS', 120, yPos + 2);
          pdf.text('DUE DATE', 150, yPos + 2);
          yPos += 8;
        }
        
        if (i % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(15, yPos - 2, pageWidth - 30, 6, 'F');
        }
        
        const client = clients.find(c => c.id === task.clientId);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        
        pdf.text((client?.name || 'Unknown').substring(0, 12), 20, yPos + 1);
        pdf.text(task.title.substring(0, 18), 60, yPos + 1);
        
        // Status with color
        const statusColors = {
          PENDING: [245, 158, 11],
          WORKING: [59, 130, 246],
          COMPLETED: [16, 185, 129]
        };
        
        pdf.setTextColor(...statusColors[task.status]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(task.status, 120, yPos + 1);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(new Date(task.dueDate).toLocaleDateString(), 150, yPos + 1);
        
        yPos += 6;
      }
      
      // Summary Section
      yPos += 10;
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 30;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Business Summary', 20, yPos);
      yPos += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`• Financial Health: Net Profit of Rs ${netProfit.toLocaleString('en-IN')}`, 25, yPos);
      yPos += 6;
      pdf.text(`• Project Progress: ${projectStats.completed}/${projectStats.total} projects completed (${projectStats.total > 0 ? Math.round((projectStats.completed / projectStats.total) * 100) : 0}%)`, 25, yPos);
      yPos += 6;
      pdf.text(`• Active Clients: ${new Set(tasks.map(t => t.clientId)).size} clients with ongoing projects`, 25, yPos);
      yPos += 6;
      pdf.text(`• Transaction Volume: ${transactions.length} total transactions recorded`, 25, yPos);
      
      // Footer
      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('EditIQ - Complete Business Report', 20, pageHeight - 12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, pageHeight - 6);
      
      // Page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 9);
      }
      
      // Save the PDF
      pdf.save(filename || `EditIQ_Complete_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Combined PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    }
  }

  // Export beautiful workspace report as PDF (Projects Only)
  static async exportWorkspacePDF(
    tasks: WorkspaceTask[],
    clients: Client[],
    userId: string,
    filename?: string
  ) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add logo from Cloudinary
      try {
        const logoUrl = 'https://res.cloudinary.com/dvd6oa63p/image/upload/v1768175554/workspacebgpng_zytu0b.png';
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = logoUrl;
        });
        
        // Add logo (top-left, 20x20mm)
        pdf.addImage(logoImg, 'PNG', 15, 10, 20, 20);
      } catch (error) {
        console.warn('Could not load logo:', error);
      }
      
      // Header with gradient effect simulation
      pdf.setFillColor(2, 6, 23); // Dark blue background
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      // Title with modern styling
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255); // White text
      pdf.text('Project Workspace', 45, 25);
      
      // Subtitle
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(148, 163, 184); // Light gray
      pdf.text('Project Management Report', 45, 32);
      
      // Workspace info
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Workspace: ${userId.slice(-8)} | ${new Date().toLocaleDateString()}`, 45, 38);
      
      // Reset colors for content
      pdf.setTextColor(0, 0, 0);
      
      let yPos = 55;
      
      // Project Statistics Only
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Project Overview', 20, yPos);
      yPos += 10;
      
      const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        working: tasks.filter(t => t.status === 'WORKING').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length
      };
      
      // Create stat cards
      const cardWidth = 40;
      const cardHeight = 25;
      const cardSpacing = 45;
      
      const statCards = [
        { label: 'Total Projects', value: stats.total, color: [100, 116, 139] },
        { label: 'Pending', value: stats.pending, color: [245, 158, 11] },
        { label: 'In Progress', value: stats.working, color: [59, 130, 246] },
        { label: 'Completed', value: stats.completed, color: [16, 185, 129] }
      ];
      
      statCards.forEach((card, index) => {
        const x = 20 + (index * cardSpacing);
        
        // Card background
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');
        
        // Card border
        pdf.setDrawColor(...card.color);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'S');
        
        // Value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(...card.color);
        pdf.text(card.value.toString(), x + cardWidth/2, yPos + 12, { align: 'center' });
        
        // Label
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105);
        pdf.text(card.label, x + cardWidth/2, yPos + 18, { align: 'center' });
      });
      
      yPos += 35;
      
      // Projects List
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Project Details', 20, yPos);
      yPos += 15;
      
      // Table header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(51, 65, 85);
      
      pdf.text('CLIENT', 20, yPos + 2);
      pdf.text('PROJECT', 60, yPos + 2);
      pdf.text('STATUS', 120, yPos + 2);
      pdf.text('DUE DATE', 150, yPos + 2);
      
      yPos += 10;
      
      // Project rows
      const sortedTasks = tasks.sort((a, b) => b.createdAt - a.createdAt);
      
      sortedTasks.forEach((task, index) => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          
          // Add header to new page
          pdf.setFillColor(2, 6, 23);
          pdf.rect(0, 0, pageWidth, 25, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(255, 255, 255);
          pdf.text('Project Workspace (continued)', 20, 15);
          
          yPos = 35;
          
          // Re-add table header
          pdf.setFillColor(241, 245, 249);
          pdf.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(51, 65, 85);
          pdf.text('CLIENT', 20, yPos + 2);
          pdf.text('PROJECT', 60, yPos + 2);
          pdf.text('STATUS', 120, yPos + 2);
          pdf.text('DUE DATE', 150, yPos + 2);
          yPos += 10;
        }
        
        // Alternating row background
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(15, yPos - 3, pageWidth - 30, 12, 'F');
        }
        
        const client = clients.find(c => c.id === task.clientId);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        
        // Client name
        pdf.text((client?.name || 'Unknown').substring(0, 15), 20, yPos + 2);
        
        // Project title
        pdf.text(task.title.substring(0, 20), 60, yPos + 2);
        
        // Status with color coding
        const statusColors = {
          PENDING: [245, 158, 11],
          WORKING: [59, 130, 246],
          COMPLETED: [16, 185, 129]
        };
        
        pdf.setTextColor(...statusColors[task.status]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(task.status, 120, yPos + 2);
        
        // Due date
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(new Date(task.dueDate).toLocaleDateString(), 150, yPos + 2);
        
        // Description (if exists)
        if (task.description) {
          pdf.setFontSize(7);
          pdf.setTextColor(100, 116, 139);
          pdf.text(task.description.substring(0, 50) + '...', 20, yPos + 7);
        }
        
        yPos += task.description ? 12 : 8;
      });
      
      // Summary at bottom
      yPos += 10;
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 30;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Workspace Summary', 20, yPos);
      yPos += 8;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`• Total Projects: ${stats.total}`, 25, yPos);
      yPos += 5;
      pdf.text(`• Active Clients: ${new Set(tasks.map(t => t.clientId)).size}`, 25, yPos);
      yPos += 5;
      pdf.text(`• Completion Rate: ${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`, 25, yPos);
      
      // Footer
      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('EditIQ Project Workspace', 20, pageHeight - 12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, pageHeight - 6);
      
      // Page number
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 9);
      }
      
      // Save the PDF
      pdf.save(filename || `EditIQ_Projects_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Workspace PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    }
  }
}