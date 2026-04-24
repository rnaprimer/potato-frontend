const API_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:3001/api";

export async function accessPotato(pinId: string, pin: string) {
  const response = await fetch(`${API_URL}/potato/access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinId, pin }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to access potato");
  }
  return response.json();
}

export async function updatePotato(pinId: string, pin: string, message: string) {
  const response = await fetch(`${API_URL}/potato/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinId, pin, message }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update potato");
  }
  return response.json();
}

export async function getPotato(id: string) {
  const response = await fetch(`${API_URL}/potato/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch potato");
  }
  return response.json();
}

export async function adminCreatePotato(admin_key: string) {
  const response = await fetch(`${API_URL}/potato/admin/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_key }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Unauthorized");
  }
  return response.json();
}

export async function createOrder() {
  const response = await fetch(`${API_URL}/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Order creation failed");
  return response.json();
}

export async function verifyPayment(paymentData: any) {
  const response = await fetch(`${API_URL}/verify-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentData),
  });
  if (!response.ok) throw new Error("Payment verification failed");
  return response.json();
}
