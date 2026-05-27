const cron = require("node-cron");
const User = require("../models/User");
const Leave = require("../models/LeaveSchema");
const nodemailer = require("nodemailer");
const monthlyLeaveBalanceTemplate = require("../template/monthlyLeaveBalanceTemplate");
const adminLeaveSummaryTemplate = require("../template/adminLeaveSummaryTemplate");

const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMonthlyLeaveBalance() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[month];
    
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    
    console.log(`Starting monthly leave balance emails for ${monthName} ${year}`);
    
    const adminUsers = await User.find({ 
      isDeleted: { $ne: true },
      role: { $in: ["coo", "ceo", "hr", "admin"] }
    });
    
    const individualUsers = await User.find({ 
      isDeleted: { $ne: true },
      role: { $in: ["Team_Leader", "employee", "IT_Support", "manager"] }
    });
    
    console.log(`Found ${adminUsers.length} admin user`);
    console.log(`Found ${individualUsers.length} emp`);
    
    //all emp data for admin
    const allEmployeesData = await User.find({ 
      isDeleted: { $ne: true },
      role: { $in: ["employee", "Team_Leader", "manager", "IT_Support", "hr"] }
    });
    
    const completeEmployeeData = [];
    
    for (const emp of allEmployeesData) {
      try {
        const monthLeaves = await Leave.find({
          employee: emp._id,
          status: "approved",
          $or: [
            { dateFrom: { $gte: startOfMonth, $lte: endOfMonth } },
            { dateTo: { $gte: startOfMonth, $lte: endOfMonth } }
          ]
        });
        
        let leavesTaken = 0;
        for (const leave of monthLeaves) {
          leavesTaken += leave.totalDays || 0;
        }
        
        completeEmployeeData.push({
          employeeId: emp.employeeId,
          name: emp.name,
          designation: emp.designation || "N/A",
          department: emp.department || "N/A",
          role: emp.role,
          cl: emp.casualLeaveBalance || 0,
          sl: emp.sickLeaveBalance || 0,
          total: (emp.casualLeaveBalance || 0) + (emp.sickLeaveBalance || 0),
          leavesTaken: leavesTaken
        });
        
      } catch (err) {
        console.error(`Failed to get data for ${emp.name}:`, err.message);
      }
    }
    
    for (const admin of adminUsers) {
      try {
        const adminHtml = await adminLeaveSummaryTemplate(monthName, year, completeEmployeeData);
        
        await transporter.sendMail({
          from: `"CWS EMS" <${process.env.EMAIL_USER}>`,
          to: admin.email,
          subject: `Monthly Leave Summary Report - ${monthName} ${year}`,
          html: adminHtml
        });
        
        console.log(`Summary report sent to ${admin.role}: ${admin.name} (${admin.email}) - Total ${completeEmployeeData.length} employees`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`Failed to send to ${admin.role} ${admin.name}:`, err.message);
      }
    }
    
    for (const emp of individualUsers) {
      try {
        const monthLeaves = await Leave.find({
          employee: emp._id,
          status: "approved",
          $or: [
            { dateFrom: { $gte: startOfMonth, $lte: endOfMonth } },
            { dateTo: { $gte: startOfMonth, $lte: endOfMonth } }
          ]
        });
        
        let leavesTaken = 0;
        for (const leave of monthLeaves) {
          leavesTaken += leave.totalDays || 0;
        }
        
        const balances = {
          cl: emp.casualLeaveBalance || 0,
          sl: emp.sickLeaveBalance || 0,
          total: (emp.casualLeaveBalance || 0) + (emp.sickLeaveBalance || 0),
          leavesTaken: leavesTaken
        };
        
        const employeeHtml = await monthlyLeaveBalanceTemplate(
          emp.name, monthName, year, balances
        );
        
        await transporter.sendMail({
          from: `"CWS EMS" <${process.env.EMAIL_USER}>`,
          to: emp.email,
          subject: `Monthly Leave Balance - ${monthName} ${year}`,
          html: employeeHtml
        });
        
        console.log(`leave balance sent to ${emp.role}: ${emp.name} (${emp.email})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`Failed to send to ${emp.role} ${emp.name}:`, err.message);
      }
    }
    
    console.log(`Monthly leave balance emails completed!`);
    console.log(`total  ${adminUsers.length} admins user receive email`);
    console.log(`total ${individualUsers.length} receive theri leave balance`);
    
  } catch (error) {
    console.error("Error in monthly leave balance cron:", error);
  }
}

cron.schedule("10 9 28-31 * *", () => {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  if (today.getDate() === lastDayOfMonth) {
    console.log("Running monthly leave balance check at:", new Date().toISOString());
    sendMonthlyLeaveBalance();
  } else {
    console.log(`Today is not last day of month (${today.getDate()}/${lastDayOfMonth}). Skipping...`);
  }
}, {
  timezone: "Asia/Kolkata"
});

module.exports = { sendMonthlyLeaveBalance };