const { supabase } = require('./supabase');

/**
 * Tracks a communication event in the database
 */
async function trackEvent(leadId, eventDetails) {
    const {
        eventType,
        provider,
        externalId,
        enrollmentId = null,
        meta = {},
        occurredAt = new Date().toISOString()
    } = eventDetails;

    try {
        const { data, error } = await supabase
            .from('comm_events')
            .upsert({
                lead_id: leadId,
                enrollment_id: enrollmentId,
                event_type: eventType,
                provider: provider,
                external_id: externalId,
                meta: meta,
                occurred_at: occurredAt
            }, { onConflict: 'external_id' });

        if (error) throw error;

        // Update Outreach Enrollment step if applicable
        if (enrollmentId && eventType === 'sent') {
            await updateEnrollmentStep(enrollmentId, meta.step);
        }

        return data;
    } catch (err) {
        console.error('Tracking Event Error:', err.message);
    }
}

async function updateEnrollmentStep(enrollmentId, step) {
    if (!step) return;
    await supabase.from('outreach_enrollments')
        .update({
            current_step: step,
            updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);
}

module.exports = { trackEvent };
