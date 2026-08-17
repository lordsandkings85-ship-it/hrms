-- AlterTable
ALTER TABLE `Asset` MODIFY `purchasePrice` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `Expense` MODIFY `amount` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `FnfSettlement` MODIFY `noticeRecovery` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `unpaidSalaryAmt` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `gratuityAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `leaveEncashAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `otherDeductions` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `netSettlement` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Invoice` MODIFY `amount` DECIMAL(10, 2) NOT NULL,
    MODIFY `gstAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Offer` MODIFY `ctc` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Payslip` MODIFY `grossPay` DECIMAL(10, 2) NOT NULL,
    MODIFY `totalDeductions` DECIMAL(10, 2) NOT NULL,
    MODIFY `netPay` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `AdditionalPayout` MODIFY `amount` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Project` MODIFY `billedAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `SalaryStructure` MODIFY `basic` DECIMAL(10, 2) NOT NULL,
    MODIFY `hra` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `da` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `conveyance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `medical` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `specialAllowance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `pfDeduction` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `esiDeduction` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `ptDeduction` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Shift` MODIFY `allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `TravelRequest` MODIFY `advance` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `LoanRequest` MODIFY `amount` DECIMAL(10, 2) NOT NULL,
    MODIFY `emi` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `amountRepaid` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `SalaryRevision` MODIFY `revisedCtc` DECIMAL(10, 2) NOT NULL,
    MODIFY `previousCtc` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `TaxDeclaration` MODIFY `declaredAmount` DECIMAL(10, 2) NOT NULL,
    MODIFY `approvedAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ProfessionalTaxSlab` MODIFY `fromAmount` DECIMAL(10, 2) NOT NULL,
    MODIFY `toAmount` DECIMAL(10, 2) NOT NULL,
    MODIFY `amount` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `LWFConfig` MODIFY `employeeShare` DECIMAL(10, 2) NOT NULL,
    MODIFY `employerShare` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `TDSSlab` MODIFY `fromAmount` DECIMAL(10, 2) NOT NULL,
    MODIFY `toAmount` DECIMAL(10, 2) NOT NULL;

