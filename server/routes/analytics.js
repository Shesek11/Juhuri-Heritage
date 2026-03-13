const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// --- Service Account Auth for GA4 Data API ---
let analyticsData = null;

function getAnalyticsData() {
    if (analyticsData) return analyticsData;

    const keyPath = path.join(__dirname, '../../gsc-service-account.json');
    if (!fs.existsSync(keyPath)) {
        throw new Error('Service account key not found');
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    return analyticsData;
}

const PROPERTY_ID = process.env.GA_PROPERTY_ID || '';

// --- Check if Analytics is configured ---
router.get('/status', authenticate, requireAdmin, (req, res) => {
    const keyPath = path.join(__dirname, '../../gsc-service-account.json');
    const configured = fs.existsSync(keyPath) && !!PROPERTY_ID;
    res.json({
        configured,
        propertyId: PROPERTY_ID ? `***${PROPERTY_ID.slice(-4)}` : null,
        measurementId: process.env.GA_MEASUREMENT_ID || null,
    });
});

// --- Overview: sessions, users, pageviews, bounce rate ---
router.get('/overview', authenticate, requireAdmin, async (req, res) => {
    try {
        if (!PROPERTY_ID) return res.status(400).json({ error: 'GA_PROPERTY_ID not configured' });

        const ad = getAnalyticsData();
        const days = parseInt(req.query.days) || 28;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const fmt = (d) => d.toISOString().split('T')[0];

        const response = await ad.properties.runReport({
            property: `properties/${PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
                dimensions: [{ name: 'date' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'totalUsers' },
                    { name: 'screenPageViews' },
                    { name: 'averageSessionDuration' },
                    { name: 'bounceRate' },
                ],
                orderBys: [{ dimension: { dimensionName: 'date', orderType: 'ALPHANUMERIC' } }],
            },
        });

        const rows = response.data.rows || [];
        const daily = rows.map(r => ({
            date: r.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
            sessions: parseInt(r.metricValues[0].value) || 0,
            users: parseInt(r.metricValues[1].value) || 0,
            pageviews: parseInt(r.metricValues[2].value) || 0,
            avgDuration: parseFloat(r.metricValues[3].value) || 0,
            bounceRate: parseFloat(r.metricValues[4].value) || 0,
        }));

        const totals = daily.reduce((acc, d) => ({
            sessions: acc.sessions + d.sessions,
            users: acc.users + d.users,
            pageviews: acc.pageviews + d.pageviews,
        }), { sessions: 0, users: 0, pageviews: 0 });

        totals.avgDuration = daily.length > 0
            ? daily.reduce((s, d) => s + d.avgDuration, 0) / daily.length : 0;
        totals.bounceRate = daily.length > 0
            ? daily.reduce((s, d) => s + d.bounceRate, 0) / daily.length : 0;

        res.json({ totals, daily });
    } catch (err) {
        console.error('Analytics overview error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Top pages ---
router.get('/pages', authenticate, requireAdmin, async (req, res) => {
    try {
        if (!PROPERTY_ID) return res.status(400).json({ error: 'GA_PROPERTY_ID not configured' });

        const ad = getAnalyticsData();
        const days = parseInt(req.query.days) || 28;
        const limit = parseInt(req.query.limit) || 20;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const fmt = (d) => d.toISOString().split('T')[0];

        const response = await ad.properties.runReport({
            property: `properties/${PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [
                    { name: 'screenPageViews' },
                    { name: 'totalUsers' },
                    { name: 'averageSessionDuration' },
                ],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit,
            },
        });

        res.json({
            pages: (response.data.rows || []).map(r => ({
                path: r.dimensionValues[0].value,
                pageviews: parseInt(r.metricValues[0].value) || 0,
                users: parseInt(r.metricValues[1].value) || 0,
                avgDuration: parseFloat(r.metricValues[2].value) || 0,
            })),
        });
    } catch (err) {
        console.error('Analytics pages error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Traffic sources ---
router.get('/sources', authenticate, requireAdmin, async (req, res) => {
    try {
        if (!PROPERTY_ID) return res.status(400).json({ error: 'GA_PROPERTY_ID not configured' });

        const ad = getAnalyticsData();
        const days = parseInt(req.query.days) || 28;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const fmt = (d) => d.toISOString().split('T')[0];

        const response = await ad.properties.runReport({
            property: `properties/${PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'totalUsers' },
                ],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 10,
            },
        });

        res.json({
            sources: (response.data.rows || []).map(r => ({
                channel: r.dimensionValues[0].value,
                sessions: parseInt(r.metricValues[0].value) || 0,
                users: parseInt(r.metricValues[1].value) || 0,
            })),
        });
    } catch (err) {
        console.error('Analytics sources error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Realtime (active users) ---
router.get('/realtime', authenticate, requireAdmin, async (req, res) => {
    try {
        if (!PROPERTY_ID) return res.status(400).json({ error: 'GA_PROPERTY_ID not configured' });

        const ad = getAnalyticsData();

        const response = await ad.properties.runRealtimeReport({
            property: `properties/${PROPERTY_ID}`,
            requestBody: {
                metrics: [{ name: 'activeUsers' }],
            },
        });

        const activeUsers = response.data.rows?.[0]?.metricValues?.[0]?.value || '0';

        res.json({ activeUsers: parseInt(activeUsers) });
    } catch (err) {
        console.error('Analytics realtime error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Device breakdown ---
router.get('/devices', authenticate, requireAdmin, async (req, res) => {
    try {
        if (!PROPERTY_ID) return res.status(400).json({ error: 'GA_PROPERTY_ID not configured' });

        const ad = getAnalyticsData();
        const days = parseInt(req.query.days) || 28;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const fmt = (d) => d.toISOString().split('T')[0];

        const response = await ad.properties.runReport({
            property: `properties/${PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
                dimensions: [{ name: 'deviceCategory' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
            },
        });

        res.json({
            devices: (response.data.rows || []).map(r => ({
                device: r.dimensionValues[0].value,
                sessions: parseInt(r.metricValues[0].value) || 0,
                users: parseInt(r.metricValues[1].value) || 0,
            })),
        });
    } catch (err) {
        console.error('Analytics devices error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
