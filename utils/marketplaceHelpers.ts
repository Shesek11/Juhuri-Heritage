import { Vendor, OpeningHours, Closure } from '../services/marketplaceService';

/**
 * Check if a vendor is currently open based on hours and closures
 */
export function isVendorOpen(vendor: Vendor): boolean {
    if (!vendor.is_active || vendor.status !== 'active') {
        return false;
    }

    if (!vendor.hours || vendor.hours.length === 0) {
        // No hours set - assume open
        return true;
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday in JS

    // Check if today is a special closure
    if (vendor.closures) {
        const todayStr = now.toISOString().split('T')[0];
        const isClosed = vendor.closures.some(
            closure => closure.closure_date.split('T')[0] === todayStr
        );
        if (isClosed) {
            return false;
        }
    }

    // Find today's hours
    const todayHours = vendor.hours.find(h => h.day_of_week === dayOfWeek);

    if (!todayHours) {
        return false; // No hours for today
    }

    if (todayHours.is_closed) {
        return false;
    }

    if (!todayHours.open_time || !todayHours.close_time) {
        return false;
    }

    // Parse times
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = todayHours.open_time.split(':').map(Number);
    const [closeH, closeM] = todayHours.close_time.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Get human-readable status of vendor (open/closed/opens at/closes at)
 */
export function getVendorStatus(vendor: Vendor): {
    isOpen: boolean;
    message: string;
    nextChangeTime?: string;
} {
    if (!vendor.is_active || vendor.status !== 'active') {
        return { isOpen: false, message: 'לא פעיל' };
    }

    if (!vendor.hours || vendor.hours.length === 0) {
        return { isOpen: true, message: 'פתוח' };
    }

    const now = new Date();
    const dayOfWeek = now.getDay();

    // Check special closures
    if (vendor.closures) {
        const todayStr = now.toISOString().split('T')[0];
        const todayClosure = vendor.closures.find(
            closure => closure.closure_date.split('T')[0] === todayStr
        );
        if (todayClosure) {
            return {
                isOpen: false,
                message: `סגור - ${todayClosure.reason || 'סגירה מיוחדת'}`
            };
        }
    }

    const todayHours = vendor.hours.find(h => h.day_of_week === dayOfWeek);

    if (!todayHours || todayHours.is_closed) {
        // Find next open day
        for (let i = 1; i <= 7; i++) {
            const nextDay = (dayOfWeek + i) % 7;
            const nextDayHours = vendor.hours.find(h => h.day_of_week === nextDay);
            if (nextDayHours && !nextDayHours.is_closed && nextDayHours.open_time) {
                const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
                return {
                    isOpen: false,
                    message: `סגור - נפתח ביום ${dayNames[nextDay]} ב-${nextDayHours.open_time.slice(0, 5)}`
                };
            }
        }
        return { isOpen: false, message: 'סגור' };
    }

    if (!todayHours.open_time || !todayHours.close_time) {
        return { isOpen: false, message: 'סגור' };
    }

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = todayHours.open_time.split(':').map(Number);
    const [closeH, closeM] = todayHours.close_time.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    if (currentTime < openTime) {
        return {
            isOpen: false,
            message: `סגור - נפתח ב-${todayHours.open_time.slice(0, 5)}`,
            nextChangeTime: todayHours.open_time
        };
    }

    if (currentTime > closeTime) {
        return {
            isOpen: false,
            message: 'סגור',
            nextChangeTime: todayHours.close_time
        };
    }

    // Currently open
    const minutesUntilClose = closeTime - currentTime;
    if (minutesUntilClose <= 30) {
        return {
            isOpen: true,
            message: `פתוח - נסגר בעוד ${minutesUntilClose} דקות`,
            nextChangeTime: todayHours.close_time
        };
    }

    return {
        isOpen: true,
        message: `פתוח עד ${todayHours.close_time.slice(0, 5)}`,
        nextChangeTime: todayHours.close_time
    };
}

/**
 * Get formatted opening hours for display
 */
export function formatOpeningHours(hours: OpeningHours[]): string[] {
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    return hours
        .sort((a, b) => a.day_of_week - b.day_of_week)
        .map(hour => {
            const day = dayNames[hour.day_of_week];
            if (hour.is_closed) {
                return `${day}: סגור`;
            }
            if (!hour.open_time || !hour.close_time) {
                return `${day}: לא מוגדר`;
            }
            return `${day}: ${hour.open_time.slice(0, 5)} - ${hour.close_time.slice(0, 5)}`;
        });
}

/**
 * Check if pickup time is valid for vendor
 */
export function isValidPickupTime(
    vendor: Vendor,
    pickupTime: Date
): { valid: boolean; reason?: string } {
    if (!vendor.is_active || vendor.status !== 'active') {
        return { valid: false, reason: 'החנות לא פעילה' };
    }

    const now = new Date();
    if (pickupTime <= now) {
        return { valid: false, reason: 'זמן האיסוף חייב להיות בעתיד' };
    }

    // Check if too far in future (more than 7 days)
    const maxFuture = new Date(now);
    maxFuture.setDate(maxFuture.getDate() + 7);
    if (pickupTime > maxFuture) {
        return { valid: false, reason: 'ניתן להזמין עד 7 ימים מראש' };
    }

    if (!vendor.hours || vendor.hours.length === 0) {
        return { valid: true }; // No restrictions
    }

    const dayOfWeek = pickupTime.getDay();
    const dateStr = pickupTime.toISOString().split('T')[0];

    // Check special closures
    if (vendor.closures) {
        const isClosed = vendor.closures.some(
            closure => closure.closure_date.split('T')[0] === dateStr
        );
        if (isClosed) {
            return { valid: false, reason: 'החנות סגורה בתאריך זה' };
        }
    }

    const dayHours = vendor.hours.find(h => h.day_of_week === dayOfWeek);

    if (!dayHours || dayHours.is_closed) {
        const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        return { valid: false, reason: `החנות סגורה ביום ${dayNames[dayOfWeek]}` };
    }

    if (!dayHours.open_time || !dayHours.close_time) {
        return { valid: false, reason: 'שעות הפעילות לא מוגדרות' };
    }

    const pickupMinutes = pickupTime.getHours() * 60 + pickupTime.getMinutes();
    const [openH, openM] = dayHours.open_time.split(':').map(Number);
    const [closeH, closeM] = dayHours.close_time.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    if (pickupMinutes < openTime || pickupMinutes > closeTime) {
        return {
            valid: false,
            reason: `החנות פתוחה בין ${dayHours.open_time.slice(0, 5)} ל-${dayHours.close_time.slice(0, 5)}`
        };
    }

    return { valid: true };
}

/**
 * Get suggested pickup times for today/tomorrow
 */
export function getSuggestedPickupTimes(vendor: Vendor): Date[] {
    if (!vendor.hours || vendor.hours.length === 0) {
        return [];
    }

    const now = new Date();
    const suggestions: Date[] = [];

    // Check today and tomorrow
    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() + dayOffset);
        const dayOfWeek = checkDate.getDay();
        const dateStr = checkDate.toISOString().split('T')[0];

        // Skip if special closure
        if (vendor.closures?.some(c => c.closure_date.split('T')[0] === dateStr)) {
            continue;
        }

        const dayHours = vendor.hours.find(h => h.day_of_week === dayOfWeek);
        if (!dayHours || dayHours.is_closed || !dayHours.open_time || !dayHours.close_time) {
            continue;
        }

        const [openH, openM] = dayHours.open_time.split(':').map(Number);
        const [closeH, closeM] = dayHours.close_time.split(':').map(Number);

        // If today, start from current time + 30 minutes
        let startH = openH;
        let startM = openM;

        if (dayOffset === 0) {
            const minPickup = new Date(now);
            minPickup.setMinutes(minPickup.getMinutes() + 30);
            startH = Math.max(openH, minPickup.getHours());
            startM = minPickup.getMinutes();

            // Round up to next 15 minutes
            startM = Math.ceil(startM / 15) * 15;
            if (startM >= 60) {
                startH++;
                startM = 0;
            }
        }

        // Generate slots every 15 minutes
        for (let h = startH; h < closeH || (h === closeH && startM === 0); h++) {
            for (let m = (h === startH ? startM : 0); m < 60; m += 15) {
                if (h === closeH && m > closeM) break;

                const slotTime = new Date(checkDate);
                slotTime.setHours(h, m, 0, 0);

                suggestions.push(slotTime);

                if (suggestions.length >= 12) {
                    return suggestions;
                }
            }
        }
    }

    return suggestions;
}
