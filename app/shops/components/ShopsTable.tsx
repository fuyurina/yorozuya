import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface ShopsTableProps {
  shops: any[];
}

export function ShopsTable({ shops }: ShopsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Toko</TableHead>
          <TableHead>Nama Toko</TableHead>
          <TableHead>ID Partner</TableHead>
          <TableHead>Token Akses</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shops.map((shop) => (
          <TableRow key={shop.id}>
            <TableCell>{shop.shop_id}</TableCell>
            <TableCell>{shop.shop_name}</TableCell>
            <TableCell>{shop.partner_id}</TableCell>
            <TableCell>
              {shop.access_token.substring(0, 10)}...
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}