const moment = require('moment')
const redis = require('../clients/redisClient');
const strings = require('../i18n/strings'); 
const logError = require('../clients/loggerClient').logError;

// Volunteer
const getRoomVolunteerKey = (id) => `room:vol:${id}`.toUpperCase()

const getVolunteerRoom = async (assignedUserId, volunteerId='') => {
    const key = getRoomVolunteerKey(assignedUserId)
    return await redis.get(key) || {
        createdAt: new Date(),
        volunteerId: volunteerId,
        history: []
    }
}

const setRoomVolunteer = async (volunteer, room) => {
    const key = getRoomVolunteerKey(volunteer.assignedUser)
    return await redis.setWithExpiration(key, room)
}

const addToVolunteer = async (volunteer, message) => {
    if (!volunteer.assignedUser) {
        logError(`No assgined user for volunteer ${volunteer.id} when trying to save history`)
    }
    let room = await getVolunteerRoom(volunteer.assignedUser, volunteer.id)
    room.history.push({
        action: 'message',
        message, 
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'volunteer',
    })
    await setRoomVolunteer(volunteer, room)
}

const setVolunteerEnded = async (volunteer) => {
    let room = await getVolunteerRoom(volunteer.assignedUser, volunteer.id)
    room.history.push({
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'volunteer',
        action: 'end',
    })
    await setRoomVolunteer(volunteer, room)
}

const setVolunteerStarted = async (volunteer) => {
    let room = await getVolunteerRoom(volunteer.assignedUser, volunteer.id)
    room.history.push({
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'volunteer',
        action: 'start',
    })
    await setRoomVolunteer(volunteer, room)
}


// User
const getRoomUserKey = (id) => `room:usr:${id}`.toUpperCase()

const getUserRoom = async (id) => {
    const key = getRoomUserKey(id)
    return await redis.get(key) || {
        createdAt: new Date(),
        userId: id,
        history: []
    }
}

const setRoomUser = async (id, room) => {
    const key = getRoomUserKey(id)
    return await redis.setWithExpiration(key, room)
}

const addToUser = async (userId, message) => {
    let room = await getUserRoom(userId)
    room.history.push({
        action: 'message',
        message, 
        time: new Date(),
        name: userId,
        id: userId,
        type: 'user'
    })
    await setRoomUser(userId, room)
}

const setUserEnded = async (userId) => {
    let room = await getUserRoom(userId)
    room.history.push({
        time: new Date(),
        name: userId,
        id: userId,
        type: 'user',
        action: 'end',
    })
    await setRoomUser(userId, room)
}

const setUserStarted = async (userId) => {
    let room = await getUserRoom(userId)
    room.history.push({
        time: new Date(),
        name: userId,
        id: userId,
        type: 'user',
        action: 'start',
    })
    await setRoomUser(userId, room)
}

// Common
const getConversationHistory= async (userId) => {
    return {
        volunteer: await getVolunteerRoom(userId),
        user: await getUserRoom(userId)
    }
}

const mapHistoryEvent = (event) => {
    try {
        if (event.action === 'start') {
            return `[${event.time}] Coversation started by user id ${event.id}`
        }
        if (event.action === 'message') {
            return `[${event.time}] ${event.name}: ${event.message}`
        }
        if (event.action === 'end') {
            return `[${event.time}] Coversation ended by ${event.name}`
        }
    } catch (error) {
        logError(`Failed to map event: ${JSON.stringify(event)}. Error:${error}`)
    }
}

const getEnhancedConversationHistory = async(userId) => {
    const rawData = await getConversationHistory(userId)
    const historyArray = rawData.user.history.concat(rawData.volunteer.history)
    const sortedHistoryArray = historyArray.sort((a,b) => new Date(a.time) - new Date(b.time))
    return sortedHistoryArray.map(mapHistoryEvent).join('\n')
}

const getTimeFromStart = async (userId) => {
    const userRoom = await getUserRoom(userId)
    const start = new Date(userRoom.createdAt)
    const diff = new Date() - start
    if (diff < 1000*60*2) {
        const time = moment(Date.now()).diff(start, 'seconds')
        const unit = strings.getString('seconds')
        return `${time} ${unit}`
    } else {
        const time = moment(Date.now()).diff(start, 'minutes')
        const unit = strings.getString('minutes')
        return `${time} ${unit}`
    }
}

const getUserMessageCount = async (userId) => {
    const room = await getUserRoom(userId)
    const onlyMessages = room.history.filter(x => x.action === 'message')
    return onlyMessages.length
}

const getVolunteerMessageCount = async (userId) => {
    const room = await getVolunteerRoom(userId)
    const onlyMessages = room.history.filter(x => x.action === 'message')
    return onlyMessages.length
}

module.exports = {
    addToUser,
    addToVolunteer,
    setUserEnded,
    setVolunteerEnded,
    setUserStarted,
    setVolunteerStarted,
    getEnhancedConversationHistory,
    getTimeFromStart,
    getUserMessageCount,
    getVolunteerMessageCount,
}