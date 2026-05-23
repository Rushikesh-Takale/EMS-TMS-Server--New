const logoURL = "https://res.cloudinary.com/dfvumzr0q/image/upload/v1764346150/email-assets/hzcl6heksswnumx0dpvj.jpg";

const leaveStatusUpdateTemplate = (employeeName, dateFrom, dateTo, status, actionReason, approverRole) => {
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
  };

  const getDateText = () => {
    if (dateFrom === dateTo) return `on ${formatDate(dateFrom)}`;
    return `from ${formatDate(dateFrom)} to ${formatDate(dateTo)}`;
  };

  const getStatusText = () => {
    if (status === "approved") return "approved";
    return "rejected";
  };

  return `
    <div style="font-family: Arial, sans-serif;">
      
      <p>Dear ${employeeName},</p>

      <p>${getGreeting()},</p>

      <p>Your leave request ${getDateText()} has been ${getStatusText()}.</p>

      <p>Status: ${status}</p>

      <p>Remarks: ${actionReason}</p>

      <p>Reviewed By: ${approverRole}</p>

      <p>Please ensure that all pending work is handed over properly before your leave period.</p>

      <p>
        Thanks & Regards,<br/>
        <strong>CWS EMS Team</strong>
      </p>

      <div style="margin-top: 10px;">
        <img src="${logoURL}" alt="Logo" style="height: 50px;">
      </div>
    </div>
  `;
};

module.exports = leaveStatusUpdateTemplate;