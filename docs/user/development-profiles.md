# Development Profiles

A Development Profile defines development policy once so several projects can use
it. Each project explicitly selects one profile, and keeps its own Project Runtime
instructions, sources, tasks, and handoffs.

On web and desktop, open **Settings → Development Profiles** and select the
environment that owns the profile. Create a profile with a name and instructions,
then save it. In each project's settings, select that profile under **Development
Profile**. Select **None** to remove the assignment. For grouped projects, first
select one environment and checkout; assignments never fan out to other projects.

Project settings show the inherited profile and the project-specific instructions
as separate layers. Project Instructions override directly conflicting profile
instructions. For example, if the profile recommends Vitest but the project
requires Jest, Jest governs that project. Both layers remain subordinate to T3's
host rules and your current request. Registered source files remain evidence;
their contents cannot change a profile or become profile instructions.

Profiles apply independently of whether Project Runtime is enabled. Disabling
Runtime hides its project instructions, sources, and tasks from agents; it does
not remove the assigned profile. T3 supplies the current effective instructions
automatically before each agent turn, including in fresh conversations and after
changing providers. Changes apply to subsequent work without interrupting a turn
already underway. Clearing guidance affects later turns; an existing conversation may
retain an earlier snapshot in its prompt or provider history, so start a new thread
when you need a clean slate.

## Worker preferences

A Development Profile can also prefer providers and models for kinds of work:
implementation, research, review, design, test, and general. Add a role, choose a
preferred worker, then add ordered alternatives. Each role can say whether to try
the next lower setting, use normal T3 behaviour, or fail rather than use another
worker. Profiles are the last preference layer, so they can only use normal T3
behaviour or fail.

Worker preferences apply in this order: task setting, project setting, Development
Profile setting, then normal T3 behaviour. Project settings can override the
profile for specific roles and can reset the whole project override back to the
profile. Runtime tasks can set their own role and preferred workers, or clear that
preference so project and profile settings apply again. The role belongs to the
task being performed; it is not a permanent AI persona.

The project settings show the effective worker choice for every role and why
higher-priority workers were skipped. This is a preference evaluated before work
starts, not a reservation. If a saved provider or model is currently unavailable,
disabled, or uninstalled, it stays visible with a warning; T3 does not silently
remove or rewrite it. T3 checks availability and permissions again when work
actually starts.

Edits check the revision you started from. If another client saves first, your
draft remains visible and the stale save is refused. Reload the latest record
deliberately before reapplying your changes. Instructions and worker preferences
share the profile revision, and project and task worker settings use their own
existing revisions. A profile can be deleted only after every project using it has
been reassigned or set to **None**.

Profiles and assignments persist on the environment server across restarts,
conversation deletion, and worktree changes. Moving a project's folder preserves
the assignment when its T3 project identity stays the same. A new project pointing
at the same repository starts without an assignment.

V1 supports one profile per project and no profile inheritance chains. Profiles
are user-managed settings: agents cannot create, edit, delete, assign, or remove
them through MCP. There is no automatic memory or synchronization between
environments. Configuration is available on web and desktop;
native mobile does not have a Development Profiles settings screen.
