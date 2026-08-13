# Security policy

ReleaseGuard parses filenames, remote metadata, and bounded file headers from untrusted releases. Please report path handling, parser denial-of-service, token exposure, or command execution vulnerabilities privately through GitHub Security Advisories.

ReleaseGuard never executes downloaded assets in its default inspection mode. Reports are escaped before untrusted release names and asset names are rendered as HTML.
