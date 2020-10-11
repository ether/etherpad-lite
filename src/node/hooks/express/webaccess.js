const assert = require('assert').strict;
const log4js = require('log4js');
const httpLogger = log4js.getLogger('http');
const settings = require('../../utils/Settings');
const hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
const readOnlyManager = require('../../db/ReadOnlyManager');

hooks.deprecationNotices.authFailure = 'use the authnFailure and authzFailure hooks instead';

const staticPathsRE = new RegExp('^/(' + [
  'api/.*',
  'favicon\\.ico',
  'javascripts/.*',
  'locales\\.json',
  'pluginfw/.*',
  'static/.*',
].join('|') + ')$');

exports.normalizeAuthzLevel = (level) => {
  if (!level) return false;
  switch (level) {
    case true:
      return 'create';
    case 'readOnly':
    case 'modify':
    case 'create':
      return level;
    default:
      httpLogger.warn(`Unknown authorization level '${level}', denying access`);
  }
  return false;
};

exports.userCanModify = (padId, req) => {
  if (readOnlyManager.isReadOnlyId(padId)) return false;
  if (!settings.requireAuthentication) return true;
  const {session: {user} = {}} = req;
  assert(user); // If authn required and user == null, the request should have already been denied.
  if (user.readOnly) return false;
  assert(user.padAuthorizations); // This is populated even if !settings.requireAuthorization.
  const level = exports.normalizeAuthzLevel(user.padAuthorizations[padId]);
  assert(level); // If !level, the request should have already been denied.
  return level !== 'readOnly';
};

// Exported so that tests can set this to 0 to avoid unnecessary test slowness.
exports.authnFailureDelayMs = 1000;

exports.checkAccess = (req, res, next) => {
  const hookResultMangle = (cb) => {
    return (err, data) => {
      if (err != null) httpLogger.error(`Error during access check: ${err}`);
      return cb(!err && data.length && data[0]);
    };
  };

  const requireAdmin = req.path.toLowerCase().indexOf('/admin') === 0;

  // This may be called twice per access: once before authentication is checked and once after (if
  // settings.requireAuthorization is true).
  const authorize = (fail) => {
    const grant = (level) => {
      level = exports.normalizeAuthzLevel(level);
      if (!level) return fail();
      const user = req.session.user;
      if (user == null) return next(); // This will happen if authentication is not required.
      const encodedPadId = (req.path.match(/^\/p\/([^/]*)/) || [])[1];
      if (encodedPadId == null) return next();
      const padId = decodeURIComponent(encodedPadId);
      // The user was granted access to a pad. Remember the authorization level in the user's
      // settings so that SecurityManager can approve or deny specific actions.
      if (user.padAuthorizations == null) user.padAuthorizations = {};
      user.padAuthorizations[padId] = level;
      return next();
    };
    const isAuthenticated = req.session && req.session.user;
    if (isAuthenticated && req.session.user.is_admin) return grant('create');
    const requireAuthn = requireAdmin || settings.requireAuthentication;
    if (!requireAuthn) return grant('create');
    if (!isAuthenticated) return grant(false);
    if (requireAdmin && !req.session.user.is_admin) return grant(false);
    if (!settings.requireAuthorization) return grant('create');
    hooks.aCallFirst('authorize', {req, res, next, resource: req.path}, hookResultMangle(grant));
  };

  // Access checking is done in four steps:
  //
  // 1) Check the preAuthorize hook for early permit/deny (permit is only allowed for non-admin
  //    pages). If any plugin explicitly grants or denies access, skip the remaining steps.
  // 2) Try to just access the thing. If access fails (perhaps authentication has not yet completed,
  //    or maybe different credentials are required), go to the next step.
  // 3) Try to authenticate. (Or, if already logged in, reauthenticate with different credentials if
  //    supported by the authn scheme.) If authentication fails, give the user a 401 error to
  //    request new credentials. Otherwise, go to the next step.
  // 4) Try to access the thing again. If this fails, give the user a 403 error.
  //
  // Plugins can use the 'next' callback (from the hook's context) to break out at any point (e.g.,
  // to process an OAuth callback). Plugins can use the preAuthzFailure, authnFailure, and
  // authzFailure hooks to override the default error handling behavior (e.g., to redirect to a
  // login page).

  let step1PreAuthorize, step2PreAuthenticate, step3Authenticate, step4Authorize;

  step1PreAuthorize = () => {
    // This aCallFirst predicate will cause aCallFirst to call the hook functions one at a time
    // until one of them returns a non-empty list, with an exception: If the request is for an
    // /admin page, truthy entries are filtered out before checking to see whether the list is
    // empty. This prevents plugin authors from accidentally granting admin privileges to the
    // general public.
    const predicate = (results) => (results != null &&
                                    results.filter((x) => (!requireAdmin || !x)).length > 0);
    hooks.aCallFirst('preAuthorize', {req, res, next}, (err, results) => {
      if (err != null) {
        httpLogger.error('Error in preAuthorize hook:', err);
        return res.status(500).send('Internal Server Error');
      }
      if (req.path.match(staticPathsRE)) results.push(true);
      if (requireAdmin) {
        // Filter out all 'true' entries to prevent plugin authors from accidentally granting admin
        // privileges to the general public.
        results = results.filter((x) => !x);
      }
      if (results.length > 0) {
        // Access was explicitly granted or denied. If any value is false then access is denied.
        if (results.every((x) => x)) return next();
        return hooks.aCallFirst('preAuthzFailure', {req, res}, hookResultMangle((ok) => {
          if (ok) return;
          // No plugin handled the pre-authentication authorization failure.
          res.status(403).send('Forbidden');
        }));
      }
      step2PreAuthenticate();
    }, predicate);
  };

  step2PreAuthenticate = () => authorize(step3Authenticate);

  step3Authenticate = () => {
    if (settings.users == null) settings.users = {};
    const ctx = {req, res, users: settings.users, next};
    // If the HTTP basic auth header is present, extract the username and password so it can be
    // given to authn plugins.
    const httpBasicAuth =
        req.headers.authorization && req.headers.authorization.search('Basic ') === 0;
    if (httpBasicAuth) {
      const userpass =
          Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString().split(':');
      ctx.username = userpass.shift();
      ctx.password = userpass.join(':');
    }
    hooks.aCallFirst('authenticate', ctx, hookResultMangle((ok) => {
      if (!ok) {
        // Fall back to HTTP basic auth.
        if (!httpBasicAuth || !(ctx.username in settings.users) ||
            settings.users[ctx.username].password !== ctx.password) {
          httpLogger.info(`Failed authentication from IP ${req.ip}`);
          return hooks.aCallFirst('authnFailure', {req, res}, hookResultMangle((ok) => {
            if (ok) return;
            return hooks.aCallFirst('authFailure', {req, res, next}, hookResultMangle((ok) => {
              if (ok) return;
              // No plugin handled the authentication failure. Fall back to basic authentication.
              res.header('WWW-Authenticate', 'Basic realm="Protected Area"');
              // Delay the error response for 1s to slow down brute force attacks.
              setTimeout(() => {
                res.status(401).send('Authentication Required');
              }, exports.authnFailureDelayMs);
            }));
          }));
        }
        settings.users[ctx.username].username = ctx.username;
        req.session.user = settings.users[ctx.username];
      }
      if (req.session.user == null) {
        httpLogger.error('authenticate hook failed to add user settings to session');
        res.status(500).send('Internal Server Error');
        return;
      }
      let username = req.session.user.username;
      username = (username != null) ? username : '<no username>';
      httpLogger.info(`Successful authentication from IP ${req.ip} for username ${username}`);
      step4Authorize();
    }));
  };

  step4Authorize = () => authorize(() => {
    return hooks.aCallFirst('authzFailure', {req, res}, hookResultMangle((ok) => {
      if (ok) return;
      return hooks.aCallFirst('authFailure', {req, res, next}, hookResultMangle((ok) => {
        if (ok) return;
        // No plugin handled the authorization failure.
        res.status(403).send('Forbidden');
      }));
    }));
  });

  step1PreAuthorize();
};

exports.expressConfigure = (hook_name, args, cb) => {
  args.app.use(exports.checkAccess);
  return cb();
};
