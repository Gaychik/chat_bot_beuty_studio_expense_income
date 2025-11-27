// Утилиты для работы с API

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export type Appointment = {
  id: string
  time: string
  duration: number
  clientName: string
  comment?: string
  status: "scheduled" | "completed" | "cancelled"
  payment?: {
    cash: number
    card: number
  }
  date?: string
}

export type Master = {
  id: string
  name: string
  color: string
}

export function getMasterId(): string | null {
    return localStorage.getItem('master_id');
}
export function setMasterId(id: string | null) {
    if (id) localStorage.setItem('master_id', id);
    else localStorage.removeItem('master_id');
}

export async function getMasters(): Promise<Master[]> {
  
    const response = await fetch(`${API_URL}/api/masters`);

       if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.reload(); // Или другая логика перенаправления
        throw new Error("Unauthorized");
    }
    if (!response.ok) throw new Error("Failed to fetch masters");
    return response.json();
}

// Получить записи для конкретного мастера
export async function getAppointments(masterId: string, date?: string): Promise<Appointment[]> {
  const url = new URL(`${API_URL}/api/appointments/${masterId}`)
  if (date) url.searchParams.append("date", date)

  const response = await authenticatedFetch(url.toString())
  if (!response.ok) throw new Error("Failed to fetch appointments")
  return response.json()
}


export async function getAllAppointments(date?: string, masterId?: string): Promise<Record<string, Appointment[]>> {
  const url = new URL(`${API_URL}/api/appointments`)
  if (date) url.searchParams.append("date", date)
  if (masterId) url.searchParams.append("master_id", masterId)
    

  const response = await authenticatedFetch(url.toString())
  if (!response.ok) throw new Error("Failed to fetch all appointments")
  return response.json()
}

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Объединяем переданные заголовки с заголовками аутентификации
    const mergedHeaders = { ...headers, ...options.headers };
    
    const response = await fetch(url, {
        ...options,
        headers: mergedHeaders
    });
    
    // Обработка 401 ошибки
    if (response.status === 401) {
        // Удаляем недействительный токен
        localStorage.removeItem('auth_token');
        // Перезагружаем страницу или перенаправляем на страницу входа
        window.location.reload();
        throw new Error("Unauthorized");
    }
    
    return response;
}


// Создать новую запись
export async function createAppointment(
  masterId: string,
  data: {
    time: string
    duration: number
    clientName: string
    comment?: string
    date: string
  },
): Promise<Appointment> {
  const response = await authenticatedFetch(`${API_URL}/api/appointments/${masterId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to create appointment");
  return response.json();
}

// Обновить запись
export async function updateAppointment(
  masterId: string,
  appointmentId: string,
  data: Partial<Appointment>,
): Promise<Appointment> {
  const response = await authenticatedFetch(`${API_URL}/api/appointments/${masterId}/${appointmentId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to update appointment");
  return response.json();
}

// Провести запись
export async function completeAppointment(
  masterId: string,
  appointmentId: string,
  payment: { cash: number; card: number },
): Promise<Appointment> {
  const response = await authenticatedFetch(`${API_URL}/api/appointments/${masterId}/${appointmentId}/complete`, {
    method: "POST",
    body: JSON.stringify({ payment }),
  });
  
  if (!response.ok) throw new Error("Failed to complete appointment");
  return response.json();
}

// Отменить запись
export async function cancelAppointment(masterId: string, appointmentId: string): Promise<Appointment> {
  const response = await authenticatedFetch(`${API_URL}/api/appointments/${masterId}/${appointmentId}/cancel`, {
    method: "POST",
  });
  
  if (!response.ok) throw new Error("Failed to cancel appointment");
  return response.json();
}

// Удалить запись
export async function deleteAppointment(masterId: string, appointmentId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/api/appointments/${masterId}/${appointmentId}`, {
    method: "DELETE",
  });
  
  if (!response.ok) throw new Error("Failed to delete appointment");
}

// Получить статистику
export async function getStats(): Promise<{
  totalAppointments: number
  completedAppointments: number
  totalRevenue: number
}> {
  const response = await authenticatedFetch(`${API_URL}/api/stats`);
  
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}

// Получить записи за диапазон дат
export async function getAppointmentsRange(
  startDate: string,
  endDate: string,
  masterId?: string,
): Promise<Record<string, Appointment[]>> {
  const url = new URL(`${API_URL}/api/appointments/range`);
  url.searchParams.append("start_date", startDate);
  url.searchParams.append("end_date", endDate);
  if (masterId) url.searchParams.append("master_id", masterId);

  const response = await authenticatedFetch(url.toString());
  
  if (!response.ok) throw new Error("Failed to fetch appointments range");
  return response.json();
}

// Получить текущую статистику с учетом диапазона дат
export async function getStatsForRange(
  startDate: string,
  endDate: string,
): Promise<{
  totalAppointments: number
  completedAppointments: number
  totalRevenue: number
}> {
  const url = new URL(`${API_URL}/api/stats/range`);
  url.searchParams.append("start_date", startDate);
  url.searchParams.append("end_date", endDate);

  const response = await authenticatedFetch(url.toString());
  
  if (!response.ok) throw new Error("Failed to fetch stats range");
  return response.json();
}


// Генерировать уникальный цвет фона для мастера на основе его ID
export function getMasterBackgroundColor(masterId: string): string {
  let hash = 0
  for (let i = 0; i < masterId.length; i++) {
    const char = masterId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const hue = Math.abs(hash) % 360
  // Возвращаем светлый HSL цвет для фона
  return `hsl(${hue}, 80%, 85%)`
}

// Генерировать яркий цвет для точек/индикаторов
export function getMasterIndicatorColor(masterId: string): string {
  let hash = 0
  for (let i = 0; i < masterId.length; i++) {
    const char = masterId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const hue = Math.abs(hash) % 360
  // Возвращаем яркий HSL цвет для точек
  return `hsl(${hue}, 100%, 45%)`
}

// Генерировать пограничный цвет для левой рамки
export function getMasterBorderColor(masterId: string): string {
  let hash = 0
  for (let i = 0; i < masterId.length; i++) {
    const char = masterId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const hue = Math.abs(hash) % 360
  // Возвращаем средний HSL цвет для рамки
  return `hsl(${hue}, 85%, 55%)`
}


// <CHANGE> Форматировать время с учетом длительности (10:00 + 90 мин = 10:00 - 11:30)
export function formatTimeRange(time: string, duration: number): string {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + duration
  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = totalMinutes % 60

  const startStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  const endStr = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`

  return `${startStr} - ${endStr}`
}

// <CHANGE> Получить CSS класс цвета для статуса записи
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'scheduled':
      return 'bg-blue-100 text-blue-700'
    case 'cancelled':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// <CHANGE> Получить русское название статуса записи
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Проведена'
    case 'scheduled':
      return 'Запланирована'
    case 'cancelled':
      return 'Отменена'
    default:
      return status
  }
}




// Функция для аутентификации через Telegram
export async function authenticateViaTelegram(telegramId: number, firstName: string): Promise<{token: string, master: Master}> {
    const response = await fetch(`${API_URL}/api/masters/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            telegram_id: telegramId,
            name: firstName
        })
    });
    
    if (!response.ok) throw new Error("Failed to authenticate via Telegram");
    return response.json();
}

// Функция для установки токена
export function setAuthToken(token: string): void {
    localStorage.setItem("auth_token", token);
}

// Функция для получения токена
export function getAuthToken(): string | null {
    return localStorage.getItem("auth_token");
}


export async function getTodayAppointments(): Promise<Appointment[]> {
  const today = new Date().toISOString().split('T')[0]
  // Получаем ID текущего мастера из localStorage
  const masterId = getMasterId();
  
  if (!masterId) {
    throw new Error("Master ID not found");
  }
  
  const data = await getAllAppointments(today, masterId)
  return Object.values(data).flat()
}

// <CHANGE> Получить все записи на эту неделю
export async function getWeekAppointments(): Promise<Appointment[]> {
  const today = new Date()
  const weekStart = new Date(today)
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  weekStart.setDate(today.getDate() + diff)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const startDateStr = weekStart.toISOString().split('T')[0]
  const endDateStr = weekEnd.toISOString().split('T')[0]
  
  // Получаем ID текущего мастера из localStorage
  const masterId = getMasterId();
  
  if (!masterId) {
    throw new Error("Master ID not found");
  }

  const data = await getAppointmentsRange(startDateStr, endDateStr, masterId)
  return Object.values(data).flat()
}