// Synthetic GuarantorData, derived from the checked-out Fineract DTO.
export const guarantors = [
  {
    id: 71,
    loanId: 473,
    firstname: "Synthetic",
    lastname: "Guarantor",
    guarantorType: { id: 3, code: "guarantor.external", value: "External" },
    clientRelationshipType: { id: 8, name: "Synthetic relationship" },
    status: true,
    mobileNumber: "PRIVATE_PHONE",
    dob: [1990, 1, 1],
    externalId: "PRIVATE_ID",
    addressLine1: "PRIVATE_ADDRESS",
    comment: "PRIVATE_COMMENT",
    guarantorFundingDetails: [{ amount: 999 }],
  },
  {
    id: 72,
    loanId: 473,
    firstname: "Synthetic Group",
    lastname: null,
    guarantorType: { id: 4, code: "guarantor.existing.group", value: "Group" },
    status: false,
  },
];
