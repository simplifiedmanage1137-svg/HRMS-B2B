// backend/routes/noticeBoardRoutes.js
const express = require('express');
const router  = express.Router();
const supabase = require('../config/supabase');

// ── GET /api/notice-board/active  (no auth — called by navbar for all users)
router.get('/active', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notice_board')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        res.json({ success: true, notice: data || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/notice-board  (admin — list all)
router.get('/', async (req, res) => {
    if (req.user?.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Admin only' });
    try {
        const { data, error } = await supabase
            .from('notice_board')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, notices: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/notice-board  (admin — create)
router.post('/', async (req, res) => {
    if (req.user?.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Admin only' });
    try {
        const {
            title, message, display_type = 'marquee', direction = 'right_to_left',
            text_color = '#2B2B2B', background_color = '#FFF8E7',
            font_style = 'normal', is_active = false
        } = req.body;

        if (!title || !message)
            return res.status(400).json({ success: false, message: 'title and message are required' });

        // If activating, deactivate all others first
        if (is_active) {
            await supabase.from('notice_board').update({ is_active: false }).eq('is_active', true);
        }

        const { data, error } = await supabase
            .from('notice_board')
            .insert([{
                title, message, display_type, direction,
                text_color, background_color, font_style,
                is_active,
                created_by: req.user?.employeeId || 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, notice: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PUT /api/notice-board/:id  (admin — update)
router.put('/:id', async (req, res) => {
    if (req.user?.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Admin only' });
    try {
        const { id } = req.params;
        const updates = { ...req.body, updated_at: new Date().toISOString() };

        // If activating this one, deactivate others
        if (updates.is_active === true) {
            await supabase.from('notice_board')
                .update({ is_active: false })
                .eq('is_active', true)
                .neq('id', id);
        }

        const { data, error } = await supabase
            .from('notice_board')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, notice: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── DELETE /api/notice-board/:id  (admin)
router.delete('/:id', async (req, res) => {
    if (req.user?.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Admin only' });
    try {
        const { error } = await supabase.from('notice_board').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
