import React from 'react';

interface EmailTemplateProps {
  meetingId: string;
  summary: string;
  actionItems: string[];
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  meetingId,
  summary,
  actionItems,
}) => (
  <div>
    <h1>Meeting Summary (ID: {meetingId})</h1>
    <h2>Summary</h2>
    <p>{summary}</p>
    <h2>Action Items</h2>
    <ul>
      {actionItems.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  </div>
);
