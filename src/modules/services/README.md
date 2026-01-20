# Services Module

## Overview
The Services Module provides comprehensive CRUD operations for managing services and assigning students to services in a multi-tenant environment. It enables organizations to track which students are enrolled in specific services.

## Features

### Core Service Operations
- **Create Service**: Add new services with name, description, and pricing
- **Read Services**: Retrieve all services with pagination or get specific service details
- **Update Service**: Modify service information including name, description, and price
- **Delete Service**: Remove services from the system

### Student Assignment Features
- **Assign Single Student**: Assign one student to a service with optional notes
- **Assign Multiple Students**: Bulk assign multiple students to a service
- **Unassign Student**: Remove a student from a service
- **View Service Students**: Get all students assigned to a specific service
- **View Student Services**: Get all services assigned to a specific student

### Additional Features
- Full multi-tenant support with tenant isolation
- Pagination support for large datasets
- Conflict detection to prevent duplicate assignments
- Comprehensive validation and error handling
- Relationship tracking with student count and payment statistics

## API Endpoints

### Service Management

#### Create Service
```http
POST /services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "University Application",
  "description": "Complete university application processing",
  "price": 500.00
}
```

#### Get All Services
```http
GET /services?page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <token>
```

#### Get Service by ID
```http
GET /services/:id
Authorization: Bearer <token>
```

#### Update Service
```http
PUT /services/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Service Name",
  "description": "Updated description",
  "price": 600.00
}
```

#### Delete Service
```http
DELETE /services/:id
Authorization: Bearer <token>
```

### Student Assignment

#### Assign Student to Service
```http
POST /services/:id/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentId": "123e4567-e89b-12d3-a456-426614174000",
  "notes": "Student interested in UK universities"
}
```

#### Assign Multiple Students to Service
```http
POST /services/:id/students/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "223e4567-e89b-12d3-a456-426614174001"
  ],
  "notes": "Batch assignment for new students"
}
```

#### Unassign Student from Service
```http
DELETE /services/:id/students/:studentId
Authorization: Bearer <token>
```

#### Get Students Assigned to Service
```http
GET /services/:id/students?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Services Assigned to Student
```http
GET /services/students/:studentId/services
Authorization: Bearer <token>
```

## Database Schema

### Service Model
```prisma
model Service {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  commissions     Commission[]
  payments        Payment[]
  studentServices StudentService[]

  @@index([tenantId])
  @@map("services")
}
```

### StudentService Junction Model
```prisma
model StudentService {
  id         String   @id @default(uuid())
  tenantId   String
  studentId  String
  serviceId  String
  assignedAt DateTime @default(now())
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([studentId, serviceId])
  @@index([tenantId, studentId])
  @@index([tenantId, serviceId])
  @@map("student_services")
}
```

## Data Transfer Objects (DTOs)

### CreateServiceDto
- `name` (required): Service name
- `description` (optional): Service description
- `price` (required): Service price

### UpdateServiceDto
- `name` (optional): Updated service name
- `description` (optional): Updated service description
- `price` (optional): Updated service price

### AssignStudentToServiceDto
- `studentId` (required): UUID of the student
- `notes` (optional): Notes about the assignment

### AssignMultipleStudentsDto
- `studentIds` (required): Array of student UUIDs
- `notes` (optional): Notes about the assignments

## Migration

After adding the Services module, run the following commands to apply the database changes:

```bash
# Generate migration
npx prisma migrate dev --name add_student_services --schema=./prisma/tenant/schema.prisma

# Apply migration
npx prisma migrate deploy --schema=./prisma/tenant/schema.prisma

# Generate Prisma Client
npx prisma generate --schema=./prisma/tenant/schema.prisma
```

## Usage Examples

### TypeScript/NestJS Service Usage

```typescript
// Inject the service
constructor(private servicesService: ServicesService) {}

// Create a service
const service = await this.servicesService.createService(tenantId, {
  name: 'Visa Application',
  description: 'Complete visa application assistance',
  price: 750.00,
});

// Assign a student
await this.servicesService.assignStudentToService(
  tenantId,
  serviceId,
  {
    studentId: '123e4567-e89b-12d3-a456-426614174000',
    notes: 'Priority student',
  }
);

// Get service with students
const serviceDetails = await this.servicesService.getServiceById(tenantId, serviceId);
```

## Error Handling

The module provides detailed error responses:

- **400 Bad Request**: Invalid input data or one or more students not found
- **404 Not Found**: Service or student not found
- **409 Conflict**: Student already assigned to service

## Security

- All endpoints require JWT authentication
- Tenant isolation ensures data separation
- Role-based access control can be added using guards

## Future Enhancements

Potential improvements for the Services module:

1. Service categories/tags for better organization
2. Service duration tracking
3. Service completion status
4. Service reviews and ratings
5. Service package bundles
6. Automated service assignment based on student criteria
7. Service analytics and reporting
8. Integration with payment processing

## Related Modules

- **Students Module**: Manages student data
- **Payments Module**: Tracks payments for services
- **Commissions Module**: Manages commission calculations
