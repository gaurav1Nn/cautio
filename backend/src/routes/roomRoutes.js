/**
 * Room Routes
 * Defines game room endpoints
 */
const express = require('express');
const router = express.Router();

const roomController = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const { validate, validateParams } = require('../middleware/validation');
const {
    createRoomSchema,
    joinRoomSchema,
    updateSettingsSchema,
    roomIdParamSchema,
} = require('../validators/roomValidator');

// All room routes require authentication
router.use(protect);

// Room management
router.post('/', validate(createRoomSchema), roomController.createRoom);
router.get('/', roomController.getRooms);
router.get('/:roomId', validateParams(roomIdParamSchema), roomController.getRoomById);
router.post('/:roomId/join', validateParams(roomIdParamSchema), validate(joinRoomSchema), roomController.joinRoom);
router.post('/:roomId/leave', validateParams(roomIdParamSchema), roomController.leaveRoom);
router.patch('/:roomId/settings', validateParams(roomIdParamSchema), validate(updateSettingsSchema), roomController.updateSettings);
router.post('/:roomId/kick/:playerId', validateParams(roomIdParamSchema), roomController.kickPlayer);

module.exports = router;
