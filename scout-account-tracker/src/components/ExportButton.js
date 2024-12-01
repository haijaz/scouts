import React from 'react';
import { Button } from 'react-bootstrap';
import * as XLSX from 'xlsx';

function ExportButton({ scouts }) {
  const exportToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create balance sheet
    const balanceData = scouts.map(scout => ({
      'Account Name': scout.name,
      'Current Balance': scout.balance.toFixed(2),
      'Account Type': scout.is_unit_account ? 'Unit Account' : 'Scout Account'
    }));
    
    const balanceSheet = XLSX.utils.json_to_sheet(balanceData);
    XLSX.utils.book_append_sheet(wb, balanceSheet, 'Account Balances');

    // Create detailed transactions sheet
    const transactionData = [];
    scouts.forEach(scout => {
      if (scout.transactions) {
        scout.transactions.forEach(transaction => {
          transactionData.push({
            'Date': new Date(transaction.date).toLocaleDateString(),
            'Account': scout.name,
            'Account Type': scout.is_unit_account ? 'Unit Account' : 'Scout Account',
            'Description': transaction.description,
            'Category': transaction.category,
            'Amount': transaction.amount.toFixed(2),
            'Type': transaction.amount >= 0 ? 'Credit' : 'Debit',
            'Transaction ID': transaction.id,
            'Transfer ID': transaction.transfer_id || 'N/A'
          });
        });
      }
    });

    // Sort transactions by date (newest first)
    transactionData.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(wb, transactionSheet, 'All Transactions');

    // Create summary sheet
    const summaryData = scouts.map(scout => {
      const transactions = scout.transactions || [];
      const totalDeposits = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      const totalPayments = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const transfersIn = transactions
        .filter(t => t.amount > 0 && t.category === 'Transfer')
        .reduce((sum, t) => sum + t.amount, 0);
      const transfersOut = transactions
        .filter(t => t.amount < 0 && t.category === 'Transfer')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        'Account Name': scout.name,
        'Account Type': scout.is_unit_account ? 'Unit Account' : 'Scout Account',
        'Total Deposits': totalDeposits.toFixed(2),
        'Total Payments': totalPayments.toFixed(2),
        'Transfers In': transfersIn.toFixed(2),
        'Transfers Out': transfersOut.toFixed(2),
        'Current Balance': scout.balance.toFixed(2),
        'Transaction Count': transactions.length
      };
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Account Summary');

    // Save the file
    const fileName = `scout_accounts_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Button 
      variant="success" 
      onClick={exportToExcel}
      className="mb-3"
    >
      Export to Excel
    </Button>
  );
}

export default ExportButton; 