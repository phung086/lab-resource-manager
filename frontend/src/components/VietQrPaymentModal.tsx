import React from 'react';
import { BaseModal2026 } from './BaseModal2026';
export interface VietQrPaymentModalProps {isOpen:boolean;onClose:()=>void;amount?:number;bookingTitle?:string;resourceName?:string;onPaidSuccess?:()=>void;}
/** Retired research placeholder; never simulates a bank result. */
export const VietQrPaymentModal=({isOpen,onClose}:VietQrPaymentModalProps)=><BaseModal2026 isOpen={isOpen} onClose={onClose} title="Thanh toán demo đã ngừng sử dụng"><p>Chỉ sử dụng yêu cầu thanh toán đã lưu tại màn hình Thanh toán khi tính năng được cấu hình.</p></BaseModal2026>;
