'use strict';
/*global Notification */

$(function () {
    var status,
        tag = (Math.random() * 10e15).toString(16);
    var serverDomain = document.domain;

    function notify(title, text, icon) {
        if (Notification.permission === 'granted') {
            icon = icon || '/static/images/wtf.png';

            var now = new Date().toTimeString().replace(/ .*$/, '');
            new Notification(title + ' @' + now, {
                body: text,
                tag: tag,
                icon: icon
            });
        }
    }

    window.Notify = notify;

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
        if (window.Notification && Notification.permission !== 'granted') {
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
            notify('Connection to ' + serverDomain + ' lost.',
                'Visual down! Radar down! What\'s happening‽');
        }, 1000);
    }

    function onReconnect() {
        connected = true;
        notify('Connection to ' + serverDomain + ' restored.',
            'I\'m baaack! Did you miss me?');
    }

    var notice, readonly= false;
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
        if (summary.global_notice_text && summary.global_notice_text !== notice){
            notice = summary.global_notice_text;
            notify('Global Notice Posted', summary.global_notice_text);
        } else {
            if (readonly && !summary.readonly) {
                notify('chmod +w','Site is no longer read-only');
            } else if (!readonly && summary.readonly){
                notify('Admin Abuse!', 'Site has been marked Readonly');
            }
            readonly = summary.readonly;
        }
        status = summary.up;
    }

    init();
}());
