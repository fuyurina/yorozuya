import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Shop {
  id: string;
  shop_id: string;
  shop_name: string;
  partner_id: string;
  access_token: string;
}

interface ShopsTableProps {
  shops: Shop[];
}

export function ShopsTable({ shops }: ShopsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] whitespace-nowrap">ID Toko</TableHead>
            <TableHead className="whitespace-nowrap">Nama Toko</TableHead>
            <TableHead className="whitespace-nowrap">ID Partner</TableHead>
            <TableHead className="whitespace-nowrap">Token Akses</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shops.map((shop) => (
            <TableRow key={shop.id}>
              <TableCell className="font-medium whitespace-nowrap">{shop.shop_id}</TableCell>
              <TableCell className="whitespace-nowrap">{shop.shop_name}</TableCell>
              <TableCell className="whitespace-nowrap">{shop.partner_id}</TableCell>
              <TableCell className="whitespace-nowrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      {shop.access_token.substring(0, 10)}...
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{shop.access_token}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
