'use strict';
var request = require('request');
var avatars = {},
    host = 'http://what.thedailywtf.com',
    browser = request.defaults({
        rejectUnauthorized: false,
        headers: {
            'User-Agent': 'SockSite'
        }
    });

function getAvatarPath(username, callback) {
    browser(host + '/users/' + username + '.json', function (err, _, body) {
        var letter = '/letter_avatar/' + username +
            '/45/3_af0dc75e546be11ab6c09c8b9d61c787.png';
        if (err) {
            return callback(null, letter);
        }
        try {
            body = JSON.parse(body);
            if (!body.user.avatar_template) {
                return callback(null, letter);
            }

            callback(null, body.user.avatar_template.replace('{size}', '45'));
        } catch (__) {
            callback(null, letter);
        }
    });
}

function getAvatar(username, callback) {
    getAvatarPath(username, function (_, path) {
        var req = browser('http://what.thedailywtf.com' + path),
            parts = [],
            res;
        req.on('error', callback);
        req.on('data', function (d) {
            parts.push(d);
        });
        req.on('response', function (resp) {
            res = resp;
        });
        req.on('end', function () {
            callback(null, {
                retrievedAt: Date.now(),
                contentType: res.headers['content-type'],
                lastModified: res.headers['last-modified'],
                data: Buffer.concat(parts)
            });
        });
    });
}

function serve(avatar, response) {
    response.writeHead(200, {
        'Content-Type': avatar.contentType,
        'Last-Modified': avatar.lastModified
    });
    response.write(avatar.data);
    response.end();
}

exports.serveAvatar = function serveAvatar(uri, _, response) {
    var username = /[/]([^/]+)$/.exec(uri)[1];
    if (avatars[username]) {
        return serve(avatars[username], response);
    }
    getAvatar(username, function (err, avatar) {
        if (err) {
            response.writeHead(500);
            response.write(err, 'binary');
            return response.end();
        }
        avatars[username] = avatar;
        serve(avatar, response);
    });
};
