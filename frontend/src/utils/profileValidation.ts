export function validateProfile(values: { fullName: string; phone: string; organization: string; customerType: string; address: { addressLine: string; provinceCode: string; wardCode: string } }) {
 const errors: Record<string,string> = {}, address = { ...values.address, addressLine: values.address.addressLine.trim() };
 const data = { fullName: values.fullName.trim(), phone: values.phone.trim(), organization: values.organization.trim(), customerType: values.customerType, ...(address.addressLine || address.provinceCode || address.wardCode ? { address } : {}) };
 if (data.fullName.length < 2 || data.fullName.length > 255) errors.fullName = 'ui.users.nameLength';
 if (data.phone && !/^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(data.phone)) errors.phone = 'ui.customer.phoneInvalid';
 if (data.organization.length > 160) errors.organization = 'ui.account.organizationLength';
 if (!['INTERNAL','EXTERNAL'].includes(data.customerType)) errors.customerType = 'ui.account.classificationRequired';
 if (data.address) { if (address.addressLine.length < 5 || address.addressLine.length > 300) errors.addressLine = 'ui.auth_address_length'; if (!address.provinceCode) errors.provinceCode = 'ui.account.provinceRequired'; if (!address.wardCode) errors.wardCode = 'ui.account.wardRequired'; }
 return { errors, data: Object.keys(errors).length ? null : data };
}
export function validatePassword(values: { currentPassword: string; newPassword: string; confirmPassword: string }) {
 const errors: Record<string,string> = {};
 if (values.currentPassword.length < 8 || values.currentPassword.length > 128) errors.currentPassword = 'ui.account.currentPasswordLength';
 if (values.newPassword.length < 8 || values.newPassword.length > 128) errors.newPassword = 'ui.account.newPasswordLength';
 else if (values.newPassword === values.currentPassword) errors.newPassword = 'ui.account.passwordDifferent';
 if (!values.confirmPassword || values.confirmPassword !== values.newPassword) errors.confirmPassword = 'ui.new_passwords_do_not_match_c6f3eeb4';
 return { errors, data: Object.keys(errors).length ? null : { currentPassword: values.currentPassword, newPassword: values.newPassword } };
}
