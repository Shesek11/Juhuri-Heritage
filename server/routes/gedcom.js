/**
 * GEDCOM Import/Export Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const gedcomService = require('../services/gedcomService');

// Configure multer for GEDCOM file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.toLowerCase();
        if (ext.endsWith('.ged') || ext.endsWith('.gedcom')) {
            cb(null, true);
        } else {
            cb(new Error('קובץ חייב להיות בפורמט GEDCOM (.ged או .gedcom)'));
        }
    }
});

// Import GEDCOM file
router.post('/import', authenticate, (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('GEDCOM upload error:', err);
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'לא נבחר קובץ' });
        }

        try {
            console.log(`Importing GEDCOM file: ${req.file.originalname} (${req.file.size} bytes)`);

            const results = await gedcomService.importGedcom(req.file.buffer, req.user.id);

            console.log('GEDCOM import results:', results);

            res.json({
                success: true,
                message: `יובאו ${results.individuals} אנשים ו-${results.families} משפחות`,
                ...results
            });
        } catch (err) {
            console.error('GEDCOM import failed:', err);
            res.status(500).json({ error: 'שגיאה בייבוא הקובץ: ' + err.message });
        }
    });
});

// Export to GEDCOM
router.get('/export', authenticate, async (req, res) => {
    try {
        const gedcomContent = await gedcomService.exportGedcom(req.user.id);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="family_tree.ged"');
        res.send(gedcomContent);
    } catch (err) {
        console.error('GEDCOM export failed:', err);
        res.status(500).json({ error: 'שגיאה בייצוא הקובץ: ' + err.message });
    }
});

module.exports = router;
