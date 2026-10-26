import React from 'react';
import { 
  Page, 
  Text, 
  View, 
  Document, 
  StyleSheet, 
  Font,
  Image
} from '@react-pdf/renderer';
import type { Invoice, InvoiceItem, Company, Client } from '../types';
import { numberToWords } from '../utils';

// Register fonts
Font.register({
  family: 'Helvetica',
  src: 'https://fonts.googleapis.com/css2?family=Helvetica:wght@300;400;700&display=swap',
});

interface InvoicePDFProps {
  invoice: Invoice;
  items: InvoiceItem[];
  company: Company;
  client: Client;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  companyInfo: {
    marginBottom: 10,
  },
  companyName: {
    fontWeight: 'bold',
  },

  companyDetails: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
    color: '#1f2937',
  },
  invoiceNumber: {
    textAlign: 'right',
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 12,
    textAlign: 'right',
    color: '#666',
  },
  clientSection: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    border: '1 solid #e5e7eb',
    textAlign:'center',
    fontWeight:'bold'
  },
  clientLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clientInfo: {
    fontSize: 11,
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    flexDirection: 'row',
    borderBottom: '1 solid #d1d5db',
  },
  tableRow: {
    padding: 10,
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
  },
  descriptionCell: {
    flex: 3,
    fontSize: 11,
    fontWeight:'bold'
  },
  quantityCell: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
  },
  unitPriceCell: {
    flex: 1.5,
    fontSize: 11,
    textAlign: 'right',
  },
  totalCell: {
    flex: 1.5,
    fontSize: 11,
    textAlign: 'right',
  },
  totalsSection: {
    alignSelf: 'flex-end',
    width: '45%',
    marginBottom: 20,
  },
  totalsBox: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 5,
    border: '1 solid #e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight:'bold'
  },
  totalValue: {
    fontSize: 12,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1 solid #d1d5db',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    textAlign: 'right',
  },
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 10,
    color: '#666',
    marginBottom:10
  },
  footer: {
    position: 'absolute',
    display:'flex',
    flexDirection:'row',
    flexWrap:'wrap',
    alignItems:'center',
    justifyContent:'center',
    gap:2,
    color:'#000',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    borderTop: '1 solid #000',
    paddingTop: 10,
  },
});

const InvoicePDF: React.FC<InvoicePDFProps> = ({ 
  invoice, 
  items, 
  company, 
  client 
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  console.log('IN THE PDF GENERATOR', invoice)
  console.log('Company logo_url:', company.logo_url)

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: company.currency || 'EUR'
    }).format(amount);
    return formatted.replace(/\u202F/g, ' ');
  };



  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {company.logo_url ? (
              <Image src={company.logo_url} style={{ width: 200, aspectRatio:5/3, objectFit: 'contain' }} />
            ) : (
              <Text style={styles.companyName}>LOGO</Text>
            )}
          </View>
          
          <View>
            <Text style={styles.invoiceTitle}>Rabat le: {formatDate(invoice.issue_date)}</Text>
          </View>
        </View>

        <View style={styles.clientSection}>
          {/* Client Information */}
          <Text style={{marginBottom: 10}}>CLIENT: {client.name}</Text>
          <Text style={{fontSize:14}}>FACTURE N°: {invoice.invoice_number}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.descriptionCell}>Désignation</Text>
            <Text style={{...styles.quantityCell, fontWeight: 'bold'}}>QTE / J</Text>
            <Text style={{...styles.unitPriceCell, fontWeight: 'bold'}}>PU HT</Text>
            <Text style={{...styles.totalCell, fontWeight: 'bold'}}>MONTANT HT</Text>
          </View>
          
          {/* Table Rows */}
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.descriptionCell}>{item.description}</Text>
              <Text style={styles.quantityCell}>{item.quantity}</Text>
              <Text style={styles.unitPriceCell}>{formatCurrency(item.unit_price)}</Text>
              <Text style={styles.totalCell}>{formatCurrency(item.total_price_ht)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL HORS TVA: </Text>
              <Text style={styles.totalValue}>{ " " + formatCurrency(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{`TVA à (${invoice.tax_rate}%):`}</Text>
              <Text style={styles.totalValue}>{ " " + formatCurrency(invoice.tax_amount)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL TTC:</Text>
              <Text style={styles.grandTotalValue}>{ " " + formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesText}>Arrête la présente facture à la somme toutes taxes comprises de:</Text>
          <Text style={styles.notesLabel}>{numberToWords(invoice.total)}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={{flexDirection:'row'}}>
            <Text style={styles.companyName}>{`${company.name}. `}</Text>
            <Text>{`Adresse: ${company.address} `}</Text><br />
          </View>
          <View style={{flexDirection:'row'}}>
            <Text>{`SARL AU Capitale: ${formatCurrency(Number(company.capital))} / `}</Text>
            <Text>{` GSM: ${[company.phone1, 'company.phone2', company.phone3].filter(Boolean).join(',')} / `}</Text>
            <Text>{` Email: ${company.email}`}</Text>
          </View>
          <Text style={{textAlign:'center', fontWeight:'bold'}}>
            {[`IF:${company.tax_number}`, company.ice && `ICE: ${company.ice}`, company.tax_pro_number && `TP: ${company.tax_pro_number}`, company.register_number && `RC: ${company.register_number}`, company.rib_number && `RIB: ${company.rib_number}`].filter(Boolean).join(' / ')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
