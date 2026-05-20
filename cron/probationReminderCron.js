const cron = require("node-cron");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const probationReminderTemplate = require("../template/probationReminderTemplate");

const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function checkProbationReminders() {
  try {
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    const employees = await User.find({
      probationCompleted: { $ne: true },
      probationEndDate: { 
        $ne: null,          
        $gte: today, 
        $lte: oneMonthLater 
      },
      probationStatus: { $ne: "approved" }  
    });

    if (employees.length === 0) {
      console.log("No employees found with upcoming probation end dates.");
      return;
    }

    const employeesWithDetails = employees.map(employee => {
      const remainingDays = Math.ceil((employee.probationEndDate - today) / (1000 * 60 * 60 * 24));
      const remainingMonths = Math.ceil(remainingDays / 30);
      return {
        name: employee.name,
        employeeId: employee.employeeId,
        designation: employee.designation || "N/A",
        doj: employee.doj,
        probationEndDate: employee.probationEndDate,
        remainingMonths: remainingMonths,
        probationStatus: employee.probationStatus, 
      };
    });

    const adminAndHR = await User.find({
      role: { $in: ["hr","admin"] }
    });

    if (adminAndHR.length === 0) {
      console.log("No admin/HR users found.");
      return;
    }

    const emailHtml = await probationReminderTemplate(employeesWithDetails);
    
    const recipientEmails = adminAndHR.map(r => r.email);
    
    await transporter.sendMail({
      from: `"CWS EMS" <${process.env.EMAIL_USER}>`,
      to: recipientEmails.join(", "), 
      subject: `Probation Period Reminder - ${employees.length} employee(s) require action`,
      html: emailHtml
    });

    console.log(`Probation reminder sent to ${recipientEmails.length} recipient(s) for ${employees.length} employee(s)`);
        
  } catch (error) {
    console.error("Error in probation reminder cron:", error);
  }
}

cron.schedule("10 9 * * *", () => {
  console.log("Running probation reminder check at:", new Date().toISOString());
  checkProbationReminders();
});

module.exports = { checkProbationReminders };