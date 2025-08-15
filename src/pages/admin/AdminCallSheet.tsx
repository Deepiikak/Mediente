import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Paper,
  Badge,
  Tabs,
  Grid,
  Card,
  ActionIcon,
  Menu,
  Modal,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconFileText,
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
  IconClipboardList,
  IconCalendar,
  IconMapPin,
  IconClock,
  IconDots,
  IconAlertCircle,
  IconMovie,
  IconPhone,
  IconLink,
} from '@tabler/icons-react';
import CallSheetForm from '../../components/CallSheetForm';
import type { CallSheetFormData } from '../../types/callsheet';
import { callSheetService } from '../../services/callSheetService';
import type { CallSheetCompleteDB } from '../../types/database/callsheet';

// Mock data for demonstration
const mockCallSheets = [
  {
    id: '1',
    project_name: 'Summer Dreams',
    date: '2024-12-20',
    call_to: 'Main Cast & Crew',
    time: '06:00',
    status: 'active',
    created_at: '2024-12-15',
    time_table: [
      { item: 'Breakfast', date: '06:00' },
      { item: 'Makeup & Hair', date: '07:00' },
      { item: 'First Shot', date: '09:00' }
    ],
    location: [
      { 
        location_title: 'Studio A', 
        link: 'https://maps.google.com/studio-a', 
        address: '123 Hollywood Blvd, Los Angeles, CA 90028', 
        contact_number: '+1 555 123 4567' 
      }
    ],
    schedule: [
      { time: '09:00', scene: 'Scene 1A - Interior Office', description: 'Main character arrives at office' },
      { time: '13:00', scene: 'Scene 2B - Exterior Building', description: 'Establishing shot of building' }
    ],
    description: 'Day 1 of principal photography'
  },
  {
    id: '2',
    project_name: 'City Lights',
    date: '2024-11-15',
    call_to: 'Photography Unit',
    time: '08:00',
    status: 'expired',
    created_at: '2024-11-10',
    time_table: [
      { item: 'Equipment Setup', date: '08:00' },
      { item: 'Lighting Check', date: '09:30' }
    ],
    location: [
      { 
        location_title: 'Downtown Location', 
        link: 'https://maps.google.com/downtown', 
        address: '456 Main St, Downtown LA, CA 90014', 
        contact_number: '+1 555 987 6543' 
      }
    ],
    schedule: [
      { time: '10:00', scene: 'Scene 5A - Street Scene', description: 'Crowd walking sequence' }
    ],
    description: 'Night shooting sequence'
  },
  {
    id: '3',
    project_name: 'Ocean Waves',
    date: '2024-12-25',
    call_to: 'Full Crew',
    time: '05:30',
    status: 'upcoming',
    created_at: '2024-12-18',
    time_table: [
      { item: 'Early Call', date: '05:30' },
      { item: 'Transportation to Beach', date: '06:00' }
    ],
    location: [
      { 
        location_title: 'Malibu Beach', 
        link: 'https://maps.google.com/malibu-beach', 
        address: 'Malibu Beach, Malibu, CA 90265', 
        contact_number: '+1 555 456 7890' 
      }
    ],
    schedule: [
      { time: '07:00', scene: 'Scene 10A - Sunrise Shot', description: 'Beautiful sunrise over ocean' }
    ],
    description: 'Beach location shoot for climax scene'
  }
];

export default function AdminCallSheet() {
  const [activeTab, setActiveTab] = useState<string | null>('recent');
  const [callSheets, setCallSheets] = useState<CallSheetCompleteDB[]>([]);
  const [editingCallSheet, setEditingCallSheet] = useState<CallSheetCompleteDB | null>(null);
  const [previewingCallSheet, setPreviewingCallSheet] = useState<CallSheetCompleteDB | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [previewModalOpened, { open: openPreviewModal, close: closePreviewModal }] = useDisclosure(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Load call sheets from database
  useEffect(() => {
    loadCallSheets();
  }, []);

  const loadCallSheets = async () => {
    setDataLoading(true);
    try {
      const response = await callSheetService.getCallSheets({}, { limit: 50, order_by: 'created_at', order_direction: 'desc' });
      setCallSheets(response.data);
    } catch (error) {
      console.error('Error loading call sheets:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load call sheets. Using demo data.',
        color: 'orange',
      });
      // Fallback to mock data if database fails (convert to proper format)
      const convertedMockData: CallSheetCompleteDB[] = mockCallSheets.map(sheet => ({
        id: sheet.id,
        project_name: sheet.project_name,
        date: sheet.date,
        call_to: sheet.call_to,
        time: sheet.time,
        description: sheet.description,
        status: sheet.status as 'draft' | 'active' | 'upcoming' | 'expired' | 'archived',
        created_at: sheet.created_at,
        updated_at: sheet.created_at,
        created_by: undefined,
        time_table: sheet.time_table.map((item, index) => ({
          id: `mock-tt-${index}`,
          call_sheet_id: sheet.id,
          item: item.item,
          time: item.date,
          sort_order: index + 1,
          created_at: sheet.created_at,
          updated_at: sheet.created_at,
        })),
        locations: sheet.location.map((loc, index) => ({
          id: `mock-loc-${index}`,
          call_sheet_id: sheet.id,
          location_title: loc.location_title,
          address: loc.address,
          link: loc.link,
          contact_number: loc.contact_number,
          sort_order: index + 1,
          created_at: sheet.created_at,
          updated_at: sheet.created_at,
        })),
        schedule: sheet.schedule.map((sch, index) => ({
          id: `mock-sch-${index}`,
          call_sheet_id: sheet.id,
          time: sch.time,
          scene: sch.scene,
          description: sch.description,
          sort_order: index + 1,
          created_at: sheet.created_at,
          updated_at: sheet.created_at,
        })),
      }));
      setCallSheets(convertedMockData);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateCallSheet = async (data: CallSheetFormData) => {
    setFormLoading(true);
    try {
      // TODO: Get actual user ID from auth context
      const userId = undefined; // Replace with actual user ID when auth is implemented
      
      const response = await callSheetService.createCallSheet(data, userId);
      
      if (response.success) {
        // Reload the data to get the complete call sheet with relations
        await loadCallSheets();
        setActiveTab('recent');
        
        notifications.show({
          title: 'Success',
          message: response.message || 'Call sheet created successfully!',
          color: 'green',
        });
      } else {
        throw new Error(response.message || 'Failed to create call sheet');
      }
    } catch (error) {
      console.error('Error creating call sheet:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create call sheet. Please try again.',
        color: 'red',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCallSheet = (callSheet: CallSheetCompleteDB) => {
    setEditingCallSheet(callSheet);
    setActiveTab('edit');
  };

  const handleUpdateCallSheet = async (data: CallSheetFormData) => {
    setFormLoading(true);
    try {
      if (!editingCallSheet) {
        throw new Error('No call sheet selected for editing');
      }

      const response = await callSheetService.updateCallSheet(editingCallSheet.id, data);
      
      if (response.success) {
        // Reload the data to get the updated call sheet with relations
        await loadCallSheets();
        setActiveTab('recent');
        setEditingCallSheet(null);
        
        notifications.show({
          title: 'Success',
          message: response.message || 'Call sheet updated successfully!',
          color: 'green',
        });
      } else {
        throw new Error(response.message || 'Failed to update call sheet');
      }
    } catch (error) {
      console.error('Error updating call sheet:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update call sheet. Please try again.',
        color: 'red',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handlePreviewCallSheet = (callSheet: CallSheetCompleteDB) => {
    setPreviewingCallSheet(callSheet);
    openPreviewModal();
  };

  const handleDeleteCallSheet = async () => {
    if (!deleteTargetId) return;
    
    try {
      const response = await callSheetService.deleteCallSheet(deleteTargetId);
      
      if (response.success) {
        // Reload the data to reflect the deletion
        await loadCallSheets();
        closeDeleteModal();
        setDeleteTargetId(null);
        
        notifications.show({
          title: 'Success',
          message: response.message || 'Call sheet deleted successfully!',
          color: 'green',
        });
      } else {
        throw new Error(response.message || 'Failed to delete call sheet');
      }
    } catch (error) {
      console.error('Error deleting call sheet:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete call sheet. Please try again.',
        color: 'red',
      });
    }
  };

  const openDeleteConfirmation = (id: string) => {
    setDeleteTargetId(id);
    openDeleteModal();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'green';
      case 'active': return 'blue';
      case 'expired': return 'red';
      case 'draft': return 'orange';
      case 'archived': return 'gray';
      default: return 'blue';
    }
  };

  const getRecentCallSheets = () => {
    const today = new Date();
    return callSheets.filter(sheet => {
      const sheetDate = new Date(sheet.date);
      return sheetDate >= today || sheet.status === 'upcoming' || sheet.status === 'active';
    });
  };

  const getExpiredCallSheets = () => {
    const today = new Date();
    return callSheets.filter(sheet => {
      const sheetDate = new Date(sheet.date);
      return sheetDate < today || sheet.status === 'expired';
    });
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} c="blue">
              <IconClipboardList size={32} style={{ marginRight: 8 }} />
              Call Sheet Management
            </Title>
            <Text c="dimmed" size="lg">
              Create and manage production call sheets
            </Text>
          </div>
          <Badge size="lg" color="blue" variant="light">
            {callSheets.length} Call Sheets
          </Badge>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="recent" leftSection={<IconCalendar size={16} />}>
              Recent Call Sheets
              <Badge size="sm" color="green" ml="xs">
                {getRecentCallSheets().length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="expired" leftSection={<IconClock size={16} />}>
              Expired Call Sheets
              <Badge size="sm" color="red" ml="xs">
                {getExpiredCallSheets().length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="create" leftSection={<IconPlus size={16} />}>
              Create Call Sheet
            </Tabs.Tab>
            {editingCallSheet && (
              <Tabs.Tab value="edit" leftSection={<IconEdit size={16} />}>
                Edit Call Sheet
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="recent" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Manage your upcoming and active call sheets
                </Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setActiveTab('create')}
                >
                  Create Call Sheet
                </Button>
              </Group>

              {dataLoading ? (
                <Center p="xl">
                  <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">Loading call sheets...</Text>
                  </Stack>
                </Center>
              ) : getRecentCallSheets().length === 0 ? (
                <Paper p="xl" ta="center">
                  <IconCalendar size={48} color="gray" />
                  <Title order={3} c="dimmed" mt="md">
                    No Recent Call Sheets
                  </Title>
                  <Text c="dimmed" mb="lg">
                    Create a new call sheet to get started
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setActiveTab('create')}
                  >
                    Create Call Sheet
                  </Button>
                </Paper>
              ) : (
                <Grid>
                  {getRecentCallSheets().map((callSheet) => (
                    <Grid.Col key={callSheet.id} span={{ base: 12, md: 6, lg: 4 }}>
                      <Card shadow="sm" p="lg" radius="md" withBorder>
                        <Group justify="space-between" mb="md">
                          <Badge color={getStatusColor(callSheet.status)} variant="light">
                            {callSheet.status.toUpperCase()}
                          </Badge>
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon variant="light" size="sm">
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item 
                                leftSection={<IconEye size={14} />}
                                onClick={() => handlePreviewCallSheet(callSheet)}
                              >
                                Preview
                              </Menu.Item>
                              <Menu.Item 
                                leftSection={<IconEdit size={14} />}
                                onClick={() => handleEditCallSheet(callSheet)}
                              >
                                Edit
                              </Menu.Item>
                              <Menu.Item leftSection={<IconDownload size={14} />}>
                                Export PDF
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item 
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={() => openDeleteConfirmation(callSheet.id)}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>

                        <Title order={4} mb="xs">
                          {callSheet.project_name}
                        </Title>

                        <Stack gap="xs" mb="md">
                          <Group gap="xs">
                            <IconCalendar size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              {new Date(callSheet.date).toLocaleDateString()}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconClock size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Call to: {callSheet.call_to}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconFileText size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Created: {new Date(callSheet.created_at).toLocaleDateString()}
                            </Text>
                          </Group>
                        </Stack>

                        <Group justify="space-between">
                          <Button 
                            variant="light" 
                            size="sm" 
                            leftSection={<IconEye size={14} />}
                            onClick={() => handlePreviewCallSheet(callSheet)}
                          >
                            Preview
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            leftSection={<IconEdit size={14} />}
                            onClick={() => handleEditCallSheet(callSheet)}
                          >
                            Edit
                          </Button>
                        </Group>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="expired" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  View past call sheets and archived productions
                </Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setActiveTab('create')}
                >
                  Create New Call Sheet
                </Button>
              </Group>

              {dataLoading ? (
                <Center p="xl">
                  <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">Loading call sheets...</Text>
                  </Stack>
                </Center>
              ) : getExpiredCallSheets().length === 0 ? (
                <Paper p="xl" ta="center">
                  <IconClock size={48} color="gray" />
                  <Title order={3} c="dimmed" mt="md">
                    No Expired Call Sheets
                  </Title>
                  <Text c="dimmed" mb="lg">
                    Past call sheets will appear here
                  </Text>
                </Paper>
              ) : (
                <Grid>
                  {getExpiredCallSheets().map((callSheet) => (
                    <Grid.Col key={callSheet.id} span={{ base: 12, md: 6, lg: 4 }}>
                      <Card shadow="sm" p="lg" radius="md" withBorder opacity={0.8}>
                        <Group justify="space-between" mb="md">
                          <Badge color={getStatusColor(callSheet.status)} variant="light">
                            {callSheet.status.toUpperCase()}
                          </Badge>
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon variant="light" size="sm">
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item 
                                leftSection={<IconEye size={14} />}
                                onClick={() => handlePreviewCallSheet(callSheet)}
                              >
                                Preview
                              </Menu.Item>
                              <Menu.Item leftSection={<IconDownload size={14} />}>
                                Export PDF
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item 
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={() => openDeleteConfirmation(callSheet.id)}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>

                        <Title order={4} mb="xs" c="dimmed">
                          {callSheet.project_name}
                        </Title>

                        <Stack gap="xs" mb="md">
                          <Group gap="xs">
                            <IconCalendar size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              {new Date(callSheet.date).toLocaleDateString()}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconClock size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Call to: {callSheet.call_to}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconFileText size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Created: {new Date(callSheet.created_at).toLocaleDateString()}
                            </Text>
                          </Group>
                        </Stack>

                        <Group justify="space-between">
                          <Button 
                            variant="light" 
                            size="sm" 
                            leftSection={<IconEye size={14} />}
                            onClick={() => handlePreviewCallSheet(callSheet)}
                          >
                            Preview
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            color="gray"
                            leftSection={<IconDownload size={14} />}
                          >
                            Export
                          </Button>
                        </Group>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="create" pt="md">
            <CallSheetForm 
              onSubmit={handleCreateCallSheet}
              isLoading={formLoading}
              mode="create"
            />
          </Tabs.Panel>

          {editingCallSheet && (
            <Tabs.Panel value="edit" pt="md">
              <CallSheetForm 
                onSubmit={handleUpdateCallSheet}
                initialData={callSheetService.dbToFormData(editingCallSheet)}
                isLoading={formLoading}
                mode="edit"
              />
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
        centered
      >
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Warning"
          color="red"
          mb="md"
        >
          This action cannot be undone. The call sheet will be permanently deleted.
        </Alert>
        <Text mb="lg">
          Are you sure you want to delete this call sheet?
        </Text>
        <Group justify="flex-end">
          <Button variant="light" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteCallSheet}>
            Delete
          </Button>
        </Group>
      </Modal>

      {/* Preview Modal */}
      <Modal
        opened={previewModalOpened}
        onClose={closePreviewModal}
        title={`Call Sheet Preview: ${previewingCallSheet?.project_name || ''}`}
        size="xl"
        centered
      >
        {previewingCallSheet && (
          <Stack gap="lg">
            {/* Basic Info */}
            <Paper p="md" withBorder>
              <Title order={4} mb="md" c="blue">
                <IconMovie size={20} style={{ marginRight: 8 }} />
                Production Details
              </Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Movie/Project:</Text>
                  <Text fw={500}>{previewingCallSheet.project_name}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Call To:</Text>
                  <Text fw={500}>{previewingCallSheet.call_to}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Date:</Text>
                  <Text fw={500}>{new Date(previewingCallSheet.date).toLocaleDateString()}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Call Time:</Text>
                  <Text fw={500}>{previewingCallSheet.time}</Text>
                </Grid.Col>
                {previewingCallSheet.description && (
                  <Grid.Col span={12}>
                    <Text size="sm" c="dimmed">Description:</Text>
                    <Text fw={500}>{previewingCallSheet.description}</Text>
                  </Grid.Col>
                )}
              </Grid>
            </Paper>

            {/* Time Table */}
            {previewingCallSheet.time_table && previewingCallSheet.time_table.length > 0 && (
              <Paper p="md" withBorder>
                <Title order={4} mb="md" c="cyan">
                  <IconClock size={20} style={{ marginRight: 8 }} />
                  Time Table
                </Title>
                <Stack gap="xs">
                  {previewingCallSheet.time_table.map((item: any, index: number) => (
                    <Group key={index} justify="space-between" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '4px' }}>
                      <Text>{item.item}</Text>
                      <Badge variant="light">{item.date}</Badge>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* Locations */}
            {previewingCallSheet.locations && previewingCallSheet.locations.length > 0 && (
              <Paper p="md" withBorder>
                <Title order={4} mb="md" c="orange">
                  <IconMapPin size={20} style={{ marginRight: 8 }} />
                  Locations
                </Title>
                <Stack gap="md">
                  {previewingCallSheet.locations.map((loc: any, index: number) => (
                    <Card key={index} p="sm" withBorder>
                      <Text fw={500} mb="xs">{loc.location_title}</Text>
                      <Text size="sm" c="dimmed" mb="xs">{loc.address}</Text>
                      <Group gap="md">
                        <Group gap="xs">
                          <IconPhone size={14} />
                          <Text size="sm">{loc.contact_number}</Text>
                        </Group>
                        {loc.link && (
                          <Group gap="xs">
                            <IconLink size={14} />
                            <Text size="sm" c="blue" component="a" href={loc.link} target="_blank">
                              View Map
                            </Text>
                          </Group>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* Schedule */}
            {previewingCallSheet.schedule && previewingCallSheet.schedule.length > 0 && (
              <Paper p="md" withBorder>
                <Title order={4} mb="md" c="green">
                  <IconCalendar size={20} style={{ marginRight: 8 }} />
                  Shooting Schedule
                </Title>
                <Stack gap="md">
                  {previewingCallSheet.schedule.map((scene: any, index: number) => (
                    <Card key={index} p="sm" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Text fw={500}>{scene.scene}</Text>
                        <Badge variant="light">{scene.time}</Badge>
                      </Group>
                      <Text size="sm" c="dimmed">{scene.description}</Text>
                    </Card>
                  ))}
                </Stack>
              </Paper>
            )}

            <Group justify="center" mt="md">
              <Button leftSection={<IconDownload size={16} />}>
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                leftSection={<IconEdit size={16} />}
                onClick={() => {
                  closePreviewModal();
                  handleEditCallSheet(previewingCallSheet);
                }}
              >
                Edit Call Sheet
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
