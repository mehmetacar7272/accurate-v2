from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.modules.customer.services import (
    create_customer,
    deactivate_customer,
    import_customers_from_excel,
    list_customers,
    update_customer,
)

router = APIRouter(prefix='/customers')


class CustomerBranchPayload(BaseModel):
    id: int | None = None
    client_key: str | None = None
    branch_name: str
    address: str
    is_default: bool = False


class CustomerContactPayload(BaseModel):
    id: int | None = None
    client_key: str | None = None
    branch_key: str | None = None
    full_name: str
    phone: str | None = None
    email: str | None = None
    title: str | None = None
    is_default: bool = False


class CustomerCreatePayload(BaseModel):
    customer_name: str
    trade_name: str
    tax_office: str | None = None
    tax_number: str | None = None
    address: str | None = None
    branch_name: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    email: str | None = None
    title: str | None = None
    branches: list[CustomerBranchPayload] = Field(default_factory=list)
    contacts: list[CustomerContactPayload] = Field(default_factory=list)


@router.get('')
def get_customers(q: str | None = None):
    return {'items': list_customers(q)}


@router.post('')
def post_customer(payload: CustomerCreatePayload):
    try:
        return create_customer(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put('/{customer_id}')
def put_customer(customer_id: int, payload: CustomerCreatePayload):
    try:
        return update_customer(customer_id, payload.model_dump())
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if 'bulunamadı' in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.delete('/{customer_id}')
def delete_customer(customer_id: int):
    try:
        return deactivate_customer(customer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if 'bulunamadı' in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post('/import')
async def post_customer_import(file: UploadFile = File(...)):
    try:
        content = await file.read()
        return import_customers_from_excel(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
