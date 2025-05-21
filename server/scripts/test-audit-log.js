// Script to test audit log creation
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function testAuditLog() {
  try {
    console.log('Starting audit log test...');
    
    // Find a valid user ID to use
    const owner = await prisma.user.findFirst({
      where: { role: 'owner' },
      select: { id: true }
    });
    
    if (!owner) {
      console.error('No owner user found to use for test');
      return;
    }
    
    console.log(`Found owner with ID: ${owner.id}`);
    
    // First, try creating with Prisma Client
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId: owner.id,
          action: 'test_audit_log',
          details: { test: true, timestamp: new Date().toISOString() }
        }
      });
      
      console.log('Successfully created audit log with Prisma Client:', auditLog.id);
    } catch (prismaError) {
      console.error('Failed to create audit log with Prisma Client:', prismaError);
      
      // Try with raw SQL as a fallback
      try {
        const auditLogId = uuidv4();
        const detailsJson = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
        
        await prisma.$executeRaw`
          INSERT INTO "AuditLog" ("id", "userId", "action", "details", "createdAt")
          VALUES (${auditLogId}, ${owner.id}, 'test_audit_log_raw', ${detailsJson}::jsonb, now())
        `;
        
        console.log('Successfully created audit log with raw SQL:', auditLogId);
      } catch (sqlError) {
        console.error('Failed to create audit log with raw SQL:', sqlError);
      }
    }
    
    // Retrieve all audit logs
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('Recent audit logs:');
    console.log(auditLogs);
    
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditLog();