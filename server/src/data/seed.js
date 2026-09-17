import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Message from '../models/Message.js';
import Digest from '../models/Digest.js';
import ActionItem from '../models/ActionItem.js';
import Conflict from '../models/Conflict.js';
import Decision from '../models/Decision.js';

dotenv.config({ path: '../.env' });

const projectTemplates = [
  {
    name: 'Cedar House Annex',
    summary: 'The facade package remains under active material review. Final stone selection is narrowed to a revised finish schedule while the master bathroom vanity wall stays on a temporary hold pending sample sign-off.',
    messages: [
      { channel: 'whatsapp', sender: 'Nora', content: 'Please use the previous marble sample from the pantry for the living room wall. We approved that earlier.', timestamp: '2026-03-03T08:10:00Z' },
      { channel: 'site', sender: 'Ravi', content: 'Site team has the previous marble on hand. We can continue with the same batch if procurement confirms stock.', timestamp: '2026-03-03T08:33:00Z' },
      { channel: 'email', sender: 'Mila', content: 'Material palette updated: use Carrara marble in the lounge and keep the matte finish. Ignore the previous sample.', timestamp: '2026-03-03T09:05:00Z' },
      { channel: 'whatsapp', sender: 'Aditi', content: 'Can we confirm the final marble selection before cutting? The current note says previous marble but email says Carrara.', timestamp: '2026-03-03T09:18:00Z' },
      { channel: 'site', sender: 'Jae', content: 'Cut list is already prepared against the previous marble. We need an immediate decision to avoid delay.', timestamp: '2026-03-03T10:02:00Z' },
      { channel: 'email', sender: 'Alicia', content: 'Rev 04 is the latest approved set. Please refer Rev 04 for all finish selections and coordinate with procurement.', timestamp: '2026-03-04T07:50:00Z' },
      { channel: 'whatsapp', sender: 'Nora', content: 'Rev 04 shows the stone as white quartz, not marble. Need clarification before the joinery team proceeds.', timestamp: '2026-03-04T08:42:00Z' },
      { channel: 'site', sender: 'Ravi', content: 'Shade 312 unavailable from current supplier. We need alternate shade approval today or we will push the facade panel order.', timestamp: '2026-03-05T11:04:00Z' },
      { channel: 'email', sender: 'Mila', content: 'Shade 312 is no longer valid. Please use shade 318 as the approved replacement on the western facade.', timestamp: '2026-03-05T11:24:00Z' },
      { channel: 'whatsapp', sender: 'Aditi', content: 'Just checked with supplier: shade 318 is on backorder too. Could we switch to 305 instead?', timestamp: '2026-03-05T11:49:00Z' },
      { channel: 'site', sender: 'Jae', content: 'Approved except master bathroom. Keep all other finishes moving as scheduled.', timestamp: '2026-03-07T14:30:00Z' },
      { channel: 'email', sender: 'Alicia', content: 'Approved except master bathroom. Please hold finish selection for the vanity wall until we receive the updated sample.', timestamp: '2026-03-07T14:52:00Z' },
      { channel: 'whatsapp', sender: 'Nora', content: 'Master bath mirror wall is still pending. The sample is arriving Thursday, so we can hold that one only.', timestamp: '2026-03-07T15:11:00Z' },
      { channel: 'site', sender: 'Ravi', content: 'Tile subcontractor locked the bathroom layout and wants the vanity wall sample approved now so we can cut the panels.', timestamp: '2026-03-08T07:42:00Z' },
      { channel: 'email', sender: 'Mila', content: 'Procurement has placed the GRC order. Please avoid any change to finish schedule beyond the bathroom hold.', timestamp: '2026-03-08T08:01:00Z' },
      { channel: 'whatsapp', sender: 'Aditi', content: 'Site issue: the plasterboard team needs the final schedule, and the bathroom hold should not affect the rest of the package.', timestamp: '2026-03-08T08:32:00Z' },
      { channel: 'site', sender: 'Jae', content: 'We can continue with the main package. Only the vanity wall and one shower niche remain on hold.', timestamp: '2026-03-08T09:20:00Z' },
      { channel: 'email', sender: 'Alicia', content: 'Final deadline stays 14 March for the main façade. Bathroom finishes move to 18 March pending sample approval.', timestamp: '2026-03-09T06:15:00Z' },
      { channel: 'whatsapp', sender: 'Nora', content: 'Deadline changed: finish package must complete by 12 March to avoid crane outage. Bathroom item is still in the critical path.', timestamp: '2026-03-09T06:34:00Z' },
    ],
  },
  {
    name: 'North Campus Lab Fitout',
    summary: 'The acoustic wall panel requirement is still contested between the original pine finish and the approved maple substitution, while the ceiling grid remains independent and can proceed without delay.',
    messages: [
      { channel: 'email', sender: 'Leah', content: 'Please ensure all acoustic panels meet the interior finish schedule submitted in Rev 08.', timestamp: '2026-04-10T08:15:00Z' },
      { channel: 'whatsapp', sender: 'Mason', content: 'The client approved the pine acoustic panels last Friday for the meeting rooms.', timestamp: '2026-04-10T08:40:00Z' },
      { channel: 'site', sender: 'Omar', content: 'Panel supplier ran out of pine. There is a maple substitute available but it has a different grain.', timestamp: '2026-04-10T09:10:00Z' },
      { channel: 'email', sender: 'Leah', content: 'Do not substitute. The approved finish is pine and no variance is allowed for the meeting rooms.', timestamp: '2026-04-10T09:42:00Z' },
      { channel: 'whatsapp', sender: 'Mason', content: 'I just spoke with procurement; maple is the only option that can still hit the commissioning date.', timestamp: '2026-04-10T10:06:00Z' },
      { channel: 'site', sender: 'Omar', content: 'Need final material decision by midday so the workshop can cut the wall panels.', timestamp: '2026-04-10T10:27:00Z' },
      { channel: 'email', sender: 'Sam', content: 'We can not delay installation. Please proceed with the maple option and issue a revised material note.', timestamp: '2026-04-10T11:18:00Z' },
      { channel: 'whatsapp', sender: 'Mason', content: 'We have a site meeting at 2pm. I will confirm the approved replacement before then.', timestamp: '2026-04-10T11:35:00Z' },
      { channel: 'site', sender: 'Omar', content: 'The workshop is ready to cut as soon as the decision is confirmed; no other room is affected.', timestamp: '2026-04-10T12:15:00Z' },
      { channel: 'email', sender: 'Leah', content: 'The original pine requirement remains. Do not lock in a substitute without written approval.', timestamp: '2026-04-10T12:58:00Z' },
      { channel: 'whatsapp', sender: 'Mason', content: 'Written approval is already pending, but we need to keep the install on schedule.', timestamp: '2026-04-10T13:22:00Z' },
      { channel: 'site', sender: 'Omar', content: 'Acoustic ceiling grid is on hold while we resolve the material. The rest of the layout is okay.', timestamp: '2026-04-11T07:55:00Z' },
      { channel: 'email', sender: 'Sam', content: 'Please recheck the hang line. The ceiling grid should not be held up by this wall panel issue.', timestamp: '2026-04-11T08:09:00Z' },
      { channel: 'whatsapp', sender: 'Mason', content: 'I reviewed the ceiling plan. The grid is independent of the panel material and can continue.', timestamp: '2026-04-11T08:23:00Z' },
      { channel: 'site', sender: 'Omar', content: 'Approved: keep the ceiling grid moving while the panel finish decision is resolved.', timestamp: '2026-04-11T08:46:00Z' },
      { channel: 'email', sender: 'Leah', content: 'The final deadline remains 26 April. No slide for the lab fitout approval cycle due to the demo room issue.', timestamp: '2026-04-12T07:12:00Z' },
      { channel: 'whatsapp', sender: 'Mason', content: 'The lab fitout deadline moved to 24 April because the client wants samples in hand before the walkthrough.', timestamp: '2026-04-12T07:20:00Z' },
      { channel: 'site', sender: 'Omar', content: 'If the deadline shifts, the mockup wall will need to be cut two days earlier to stay on track.', timestamp: '2026-04-12T08:05:00Z' },
      { channel: 'email', sender: 'Sam', content: 'Proceed with the mockup wall and hold the final install until the client signs the finish note.', timestamp: '2026-04-12T09:14:00Z' },
      { channel: 'whatsapp', sender: 'Mason', content: 'Client signoff still expected by 23 April, so we can keep the mockup moving and await final finish confirmation.', timestamp: '2026-04-12T09:32:00Z' },
    ],
  },
  {
    name: 'Harbour Point Retrofit',
    summary: 'The retrofit remains in early survey coordination. Access and scaffold approvals are lined up, with the structural comments still pending before the rest of the package can be locked.',
    messages: [
      { channel: 'email', sender: 'Priya', content: 'Kicking off the retrofit thread here. Survey drawings are with the structural team for review.', timestamp: '2026-05-04T09:00:00Z' },
      { channel: 'whatsapp', sender: 'Dev', content: 'Scaffold goes up Monday. Nothing else is locked in yet, so shout if anything changes.', timestamp: '2026-05-04T09:26:00Z' },
      { channel: 'site', sender: 'Priya', content: 'Roof access is confirmed for the survey. We will pick up the rest once the structural comments land.', timestamp: '2026-05-05T07:40:00Z' },
    ],
  },
];

const findMessageByText = (messages, snippets) => {
  for (const snippet of snippets) {
    const match = messages.find((message) => message.content.toLowerCase().includes(snippet.toLowerCase()));
    if (match) return match;
  }
  return messages[0] || null;
};

const seedDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/keystone';
  await mongoose.connect(mongoUri);

  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Message.deleteMany({}),
    Digest.deleteMany({}),
    ActionItem.deleteMany({}),
    Conflict.deleteMany({}),
    Decision.deleteMany({}),
  ]);

  const demoPassword = await bcrypt.hash('keystone123', 10);

  const users = await User.insertMany([
    { name: 'Ava Morgan', email: 'ava@keystone.app', password: demoPassword, role: 'admin' },
    { name: 'Leo Hart', email: 'leo@keystone.app', password: demoPassword, role: 'member' },
  ]);

  const createdProjects = [];
  const insertedDigests = [];
  const insertedActions = [];
  const insertedConflicts = [];
  const insertedDecisions = [];

  for (const template of projectTemplates) {
    const project = await Project.create({
      name: template.name,
      members: users.map((user) => user._id),
      createdBy: users[0]._id,
    });

    const messages = template.messages.map((item) => ({
      project: project._id,
      channel: item.channel,
      sender: item.sender,
      content: item.content,
      timestamp: new Date(item.timestamp),
    }));

    const createdMessages = await Message.insertMany(messages);

    insertedDigests.push({
      project: project._id,
      summaryText: template.summary,
      generatedAt: new Date(),
    });

    const actionTemplates =
      project.name === 'Cedar House Annex'
        ? [
            {
              description: 'Confirm final stone selection for the living room and facade before production cutting begins.',
              owner: 'Alicia',
              status: 'open',
              dueDate: '2026-03-11',
              messageSnippets: ['final marble selection', 'Rev 04 shows the stone as white quartz', 'shade 318 is on backorder'],
            },
            {
              description: 'Lock the bathroom vanity wall finish and communicate the hold to the tile and plasterboard trades.',
              owner: 'Nora',
              status: 'open',
              dueDate: '2026-03-18',
              messageSnippets: ['master bath mirror wall is still pending', 'vanity wall', 'bathroom hold'],
            },
            {
              description: 'Issue the revised finishing schedule so the main package can proceed without the bathroom hold.',
              owner: 'Ravi',
              status: 'done',
              dueDate: '2026-03-08',
              messageSnippets: ['final deadline stays 14 March', 'main package', 'keep all other finishes moving'],
            },
          ]
        : project.name === 'North Campus Lab Fitout'
          ? [
              {
                description: 'Resolve the acoustic panel material decision before the meeting-room workshop cuts start.',
                owner: 'Leah',
                status: 'open',
                dueDate: '2026-04-11',
                messageSnippets: ['final material decision by midday', 'do not substitute', 'written approval'],
              },
              {
                description: 'Keep the ceiling grid on schedule while the wall panel finish waits for sign-off.',
                owner: 'Omar',
                status: 'done',
                dueDate: '2026-04-11',
                messageSnippets: ['ceiling grid moving', 'grid is independent', 'keep the ceiling grid moving'],
              },
              {
                description: 'Prepare the mockup wall and hold full install until client finish sign-off is received.',
                owner: 'Sam',
                status: 'open',
                dueDate: '2026-04-23',
                messageSnippets: ['mockup wall', 'client signs the finish note', 'signoff still expected'],
              },
            ]
          : [
              {
                description: 'Confirm roof access and structural review before the retrofit scope is locked.',
                owner: 'Priya',
                status: 'open',
                dueDate: '2026-05-07',
                messageSnippets: ['survey drawings are with the structural team', 'roof access is confirmed', 'structural comments land'],
              },
            ];

    for (const item of actionTemplates) {
      const source = findMessageByText(createdMessages, item.messageSnippets);
      insertedActions.push({
        project: project._id,
        sourceMessage: source?._id || createdMessages[0]._id,
        description: item.description,
        owner: item.owner,
        status: item.status,
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
      });
    }

    const conflictTemplates = [
      {
        projectName: 'Cedar House Annex',
        description: 'Stone material requirements conflict between the original marble approval, the later Carrara instruction, and the white quartz revision.',
        messageSnippets: ['previous marble sample', 'use Carrara marble', 'white quartz, not marble'],
        resolutionStatus: 'unresolved',
      },
      {
        projectName: 'North Campus Lab Fitout',
        description: 'Meeting-room panel finish is contested between the approved pine requirement and the maple substitute needed for schedule risk.',
        messageSnippets: ['approved the pine acoustic panels', 'Do not substitute', 'maple is the only option'],
        resolutionStatus: 'resolved',
      },
      {
        projectName: 'Harbour Point Retrofit',
        description: 'The retrofit schedule is blocked by missing structural review input even though scaffold and access are already approved.',
        messageSnippets: ['structural team for review', 'Scaffold goes up Monday', 'roof access is confirmed'],
        resolutionStatus: 'unresolved',
      },
    ];

    for (const conflict of conflictTemplates) {
      if (project.name !== conflict.projectName) continue;
      const refs = conflict.messageSnippets
        .map((snippet) => createdMessages.find((message) => message.content.toLowerCase().includes(snippet.toLowerCase())))
        .filter(Boolean)
        .map((message) => message._id);
      insertedConflicts.push({
        project: project._id,
        conflictingMessageRefs: refs,
        description: conflict.description,
        resolutionStatus: conflict.resolutionStatus,
      });
    }

    const decisionTemplates = [
      {
        projectName: 'Cedar House Annex',
        description: 'Main façade finish package continues under the revised schedule except for the master bathroom vanity wall hold pending sample approval.',
        sourceSnippet: 'Final deadline stays 14 March for the main façade',
        status: 'decided',
        decidedBy: 'Alicia',
      },
      {
        projectName: 'North Campus Lab Fitout',
        description: 'Ceiling grid works continue independently while the acoustic panel finish awaits client sign-off.',
        sourceSnippet: 'Approved: keep the ceiling grid moving',
        status: 'decided',
        decidedBy: 'Omar',
      },
      {
        projectName: 'North Campus Lab Fitout',
        description: 'The final acoustic panel finish remains pending client approval before installation is allowed to proceed.',
        sourceSnippet: 'Client signoff still expected by 23 April',
        status: 'pending_approval',
        decidedBy: 'Mason',
      },
      {
        projectName: 'Harbour Point Retrofit',
        description: 'Roof access and scaffold are approved; the remaining retrofit scope waits for structural review comments before sequencing the full package.',
        sourceSnippet: 'Roof access is confirmed for the survey',
        status: 'pending_approval',
        decidedBy: 'Priya',
      },
    ];

    for (const decision of decisionTemplates) {
      if (project.name !== decision.projectName) continue;
      const sourceMessage = findMessageByText(createdMessages, [decision.sourceSnippet]);
      insertedDecisions.push({
        project: project._id,
        sourceMessage: sourceMessage?._id || createdMessages[0]._id,
        description: decision.description,
        status: decision.status,
        decidedBy: decision.decidedBy,
      });
    }

    createdProjects.push(project);
  }

  if (insertedDigests.length) {
    await Digest.insertMany(insertedDigests);
  }
  if (insertedActions.length) {
    await ActionItem.insertMany(insertedActions);
  }
  if (insertedConflicts.length) {
    await Conflict.insertMany(insertedConflicts);
  }
  if (insertedDecisions.length) {
    await Decision.insertMany(insertedDecisions);
  }

  console.log('Seeded demo users and projects with realistic project threads, tasks, conflicts, and decisions.');
  console.log('Users:', users.map((user) => user.email));
  console.log('Projects:', createdProjects.map((project) => project.name));
  console.log('Tasks:', insertedActions.length, 'Conflicts:', insertedConflicts.length, 'Decisions:', insertedDecisions.length);

  await mongoose.disconnect();
};

seedDatabase().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
