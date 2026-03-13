const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// --- Service Account Auth ---
let searchConsole = null;

function getSearchConsole() {
    if (searchConsole) return searchConsole;

    const keyPath = path.join(__dirname, '../../gsc-service-account.json');
    if (!fs.existsSync(keyPath)) {
        throw new Error('GSC service account key not found');
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    searchConsole = google.searchconsole({ version: 'v1', auth });
    return searchConsole;
}

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

// --- Check if GSC is configured ---
router.get('/status', authenticate, requireAdmin, (req, res) => {
    const keyPath = path.join(__dirname, '../../gsc-service-account.json');
    const configured = fs.existsSync(keyPath);
    res.json({ configured, siteUrl: SITE_URL });
});

// --- Performance data (clicks, impressions, CTR, position) ---
router.get('/performance', authenticate, requireAdmin, async (req, res) => {
    try {
        const sc = getSearchConsole();
        const days = parseInt(req.query.days) || 28;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const fmt = (d) => d.toISOString().split('T')[0];

        const response = await sc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: {
                startDate: fmt(startDate),
                endDate: fmt(endDate),
                dimensions: ['date'],
                rowLimit: days,
            },
        });

        // Calculate totals
        const rows = response.data.rows || [];
        const totals = rows.reduce((acc, row) => ({
            clicks: acc.clicks + (row.clicks || 0),
            impressions: acc.impressions + (row.impressions || 0),
            ctr: 0,
            position: 0,
        }), { clicks: 0, impressions: 0, ctr: 0, position: 0 });

        if (totals.impressions > 0) {
            totals.ctr = totals.clicks / totals.impressions;
        }
        if (rows.length > 0) {
            totals.position = rows.reduce((sum, r) => sum + (r.position || 0), 0) / rows.length;
        }

        res.json({
            totals,
            daily: rows.map(r => ({
                date: r.keys[0],
                clicks: r.clicks || 0,
                impressions: r.impressions || 0,
                ctr: r.ctr || 0,
                position: r.position || 0,
            })),
        });
    } catch (err) {
        console.error('GSC performance error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Top queries ---
router.get('/queries', authenticate, requireAdmin, async (req, res) => {
    try {
        const sc = getSearchConsole();
        const days = parseInt(req.query.days) || 28;
        const limit = parseInt(req.query.limit) || 20;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const fmt = (d) => d.toISOString().split('T')[0];

        const response = await sc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: {
                startDate: fmt(startDate),
                endDate: fmt(endDate),
                dimensions: ['query'],
                rowLimit: limit,
                orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
            },
        });

        res.json({
            queries: (response.data.rows || []).map(r => ({
                query: r.keys[0],
                clicks: r.clicks || 0,
                impressions: r.impressions || 0,
                ctr: r.ctr || 0,
                position: r.position || 0,
            })),
        });
    } catch (err) {
        console.error('GSC queries error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Top pages ---
router.get('/pages', authenticate, requireAdmin, async (req, res) => {
    try {
        const sc = getSearchConsole();
        const days = parseInt(req.query.days) || 28;
        const limit = parseInt(req.query.limit) || 20;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const fmt = (d) => d.toISOString().split('T')[0];

        const response = await sc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: {
                startDate: fmt(startDate),
                endDate: fmt(endDate),
                dimensions: ['page'],
                rowLimit: limit,
                orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
            },
        });

        res.json({
            pages: (response.data.rows || []).map(r => ({
                page: r.keys[0].replace(SITE_URL, ''),
                clicks: r.clicks || 0,
                impressions: r.impressions || 0,
                ctr: r.ctr || 0,
                position: r.position || 0,
            })),
        });
    } catch (err) {
        console.error('GSC pages error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Index status (sitemaps info) ---
router.get('/index-status', authenticate, requireAdmin, async (req, res) => {
    try {
        const sc = getSearchConsole();
        const response = await sc.sitemaps.list({ siteUrl: SITE_URL });

        res.json({
            sitemaps: (response.data.sitemap || []).map(s => ({
                path: s.path,
                lastSubmitted: s.lastSubmitted,
                lastDownloaded: s.lastDownloaded,
                isPending: s.isPending,
                warnings: s.warnings,
                errors: s.errors,
                contents: s.contents,
            })),
        });
    } catch (err) {
        console.error('GSC index status error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
