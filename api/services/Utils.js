var moment = require("moment");
var _ = require("lodash");

module.exports = {
  Object: {
    clean: function clean(obj) {
      for (var key in obj) {
        if (JSON.stringify(obj[key]) == "{}" || !obj[key]) {
          delete obj[key];
        } else if (typeof obj[key] == "object") {
          obj[key] = this.clean(obj[key]);
        }
      }
      return obj;
    }
  },

  isRuntimeVersionSupported() {
    const minRequiredNodeVersion = '18.0.0';
    const semver = require('semver');
    return semver.gte(process.versions.node, minRequiredNodeVersion);
  },

  getMinutesDiff: function (start, end) {
    var duration = moment.duration(moment(start).diff(moment(end)));
    return duration.asMinutes();
  },

  getAdminEmailList: function (cb) {
    sails.models.user.find({
      admin: true
    }).exec(function (err, admins) {
      if (err) return cb(err)
      if (!admins.length) return cb([])
      return cb(null, admins.map(function (item) {
        return item.email;
      }));
    });
  },

  sendSlackNotification: function (settings, message) {
    sails.log("Sending notification to slack", settings.data.integrations, message);

    var slack = _.find(settings.data.integrations, function (item) {
      return item.id === 'slack'
    })

    if (!slack || !slack.config.enabled) return;

    var axios = require('axios');

    var field = _.find(slack.config.fields, function (item) {
      return item.id == 'slack_webhook_url'
    })

    var url = field ? field.value : "";

    axios.post(url, {
      text: message
    }).then(function (response) {
      sails.log('Received', response.status, 'from Slack');
    }).catch(function (err) {
      sails.log('Error:', err);
    });
  },

  ensureSemverFormat: function (version) {
    if(version.indexOf("-") < 0) {
      let firstAlphaIndex = version.search(/[a-zA-Z]/);
      if(firstAlphaIndex > -1) {
        return version.substring(0, firstAlphaIndex);
      }
    }
    return version;
  },

  withoutTrailingSlash(str) {
    if(!str) return str;
    return str.replace(/\/$/, "")
  },
}
