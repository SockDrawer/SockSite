'use strict';
/*global Notification */
$(function () {
    var status,
        tag = (Math.random() * 10e15).toString(16);

    function notify(title, text) {
        if (Notification.permission === 'granted') {
            var now = new Date().toTimeString().replace(/ .*$/, '');
            new Notification(title + ' @' + now, {
                body: text,
                tag: tag,
                icon: '/static/images/wtf.png'
            });
        }
    }

    function init() {
        var res = setupNotifications();
        if (!res) {
            setTimeout(init, 100);
        }
    }

    function registerListeners() {
        if (Notification.permission === 'granted') {
            window.socket.on('summary', onSummary);
            window.socket.on('disconnect', onDisconnect);
            window.socket.on('reconnect', onReconnect);
        }
    }

    function setupNotifications() {
        if (!window.socket) {
            return false;
        }
        if (window.Notification && Notification.permission !== "granted") {
            Notification.requestPermission(function (status) {
                if (Notification.permission !== status) {
                    Notification.permission = status;
                }
                registerListeners();
            });
        } else {
            registerListeners();
        }
        return true;
    }

    var connected = true;

    function onDisconnect() {
        connected = false;
        setTimeout(function () {
            if (connected) {
                return;
            }
            notify('Connection to servercooties.com lost.',
                'Visual down! Radar down! What\'s happening‽');
        }, 400);
    }

    function onReconnect() {
        connected = true;
        notify('Connection to servercooties.com restored.',
            'I\'m baaack! Did you miss me?');
    }

    function onSummary(summary) {
        if (status !== undefined && status !== summary.up) {
            if (status) {
                notify('Site Offline',
                    'Cooties have infected the server; recommend to keep a ' +
                    'safe distance and don\'t obstruct the Hazmat team');
            } else {
                notify('Site Online', 'Server cootie infection neutralised; ' +
                    'normal service will now resume');
            }
        }
        status = summary.up;
    }

    init();
}());
