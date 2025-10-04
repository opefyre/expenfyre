// Groups Service - Manages groups and group members
// This service handles all group-related operations and user access control

export interface Group {
  group_id: string
  name: string
  description: string
  owner_email: string
  created_at: string
  updated_at: string
  status: 'active' | 'inactive'
}

export interface GroupMember {
  group_member_id: string
  group_id: string
  user_email: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  status: 'active' | 'inactive'
}

export interface CreateGroupData {
  name: string
  description: string
}

export interface UpdateGroupData {
  name?: string
  description?: string
}

export interface AddMemberData {
  user_email: string
  role: 'admin' | 'member'
}

export class GroupsService {
  constructor(private env: any) {}

  // Get Google Sheets service
  private async getSheetsService() {
    const authService = new (await import('./auth.service')).AuthService(this.env)
    return await authService.getSheetsService()
  }

  // Get AuthService
  private async getAuthService() {
    const { AuthService } = await import('./auth.service')
    return new AuthService(this.env)
  }

  // Create a new group
  async createGroup(userEmail: string, groupData: CreateGroupData): Promise<Group> {
    try {
      console.log('[GROUPS] Creating group for user:', userEmail)
      console.log('[GROUPS] Group data:', groupData)

      const authService = await this.getAuthService()
      const sheets = await this.getSheetsService()

      const groupId = `GRP${Date.now()}${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const newGroup: Group = {
        group_id: groupId,
        name: groupData.name,
        description: groupData.description,
        owner_email: userEmail,
        created_at: now,
        updated_at: now,
        status: 'active'
      }

      // Add group to Groups sheet
      const range = 'Groups!A:G'
      const values = [[
        newGroup.group_id,
        newGroup.name,
        newGroup.description,
        newGroup.owner_email,
        newGroup.created_at,
        newGroup.updated_at,
        newGroup.status
      ]]

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.env.SHEET_ID,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: [values[0]] }
      })

      // Add owner as group member
      await this.addGroupMember(userEmail, groupId, userEmail, 'owner')

      console.log('[GROUPS] Group created successfully:', groupId)
      return newGroup
    } catch (error) {
      console.error('[GROUPS] Error creating group:', error)
      throw new Error('Failed to create group')
    }
  }

  // Get groups for a user
  async getUserGroups(userEmail: string): Promise<Group[]> {
    try {
      console.log('[GROUPS] Getting groups for user:', userEmail)

      const authService = await this.getAuthService()
      const sheets = await this.getSheetsService()

      // Get all groups
      const groupsRange = 'Groups!A:G'
      const groupsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range: groupsRange
      })

      const groupsRows = groupsResponse.data.values || []
      if (groupsRows.length <= 1) {
        return []
      }

      const groupsHeaders = groupsRows[0]
      const groupIdIndex = groupsHeaders.indexOf('group_id')
      const nameIndex = groupsHeaders.indexOf('name')
      const descriptionIndex = groupsHeaders.indexOf('description')
      const ownerEmailIndex = groupsHeaders.indexOf('owner_email')
      const createdAtIndex = groupsHeaders.indexOf('created_at')
      const updatedAtIndex = groupsHeaders.indexOf('updated_at')
      const statusIndex = groupsHeaders.indexOf('status')

      // Parse groups
      const allGroups: Group[] = groupsRows.slice(1).map((row: any[]) => ({
        group_id: row[groupIdIndex] || '',
        name: row[nameIndex] || '',
        description: row[descriptionIndex] || '',
        owner_email: row[ownerEmailIndex] || '',
        created_at: row[createdAtIndex] || '',
        updated_at: row[updatedAtIndex] || '',
        status: (row[statusIndex] as 'active' | 'inactive') || 'active'
      }))

      // Get user's group memberships
      const membersRange = 'Group_Members!A:F'
      const membersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range: membersRange
      })

      const membersRows = membersResponse.data.values || []
      if (membersRows.length <= 1) {
        return []
      }

      const membersHeaders = membersRows[0]
      const memberGroupIdIndex = membersHeaders.indexOf('group_id')
      const memberUserEmailIndex = membersHeaders.indexOf('user_email')
      const memberStatusIndex = membersHeaders.indexOf('status')

      console.log('[GROUPS] Group_Members headers:', membersHeaders)
      console.log('[GROUPS] Total member rows:', membersRows.length - 1)
      console.log('[GROUPS] Looking for user email:', userEmail)
      console.log('[GROUPS] Column indices - groupId:', memberGroupIdIndex, 'userEmail:', memberUserEmailIndex, 'status:', memberStatusIndex)

      // Log all member emails for debugging
      membersRows.slice(1).forEach((row: any[], index: number) => {
        console.log(`[GROUPS] Member row ${index}:`, {
          email: row[memberUserEmailIndex],
          groupId: row[memberGroupIdIndex],
          status: row[memberStatusIndex],
          matches: row[memberUserEmailIndex] === userEmail
        })
      })

      // Get user's active group IDs
      const userGroupIds = membersRows.slice(1)
        .filter((row: any[]) => 
          row[memberUserEmailIndex] === userEmail && 
          (row[memberStatusIndex] === 'active' || !row[memberStatusIndex])
        )
        .map((row: any[]) => row[memberGroupIdIndex])

      console.log('[GROUPS] User group IDs found:', userGroupIds)

      // Filter groups to only include user's groups
      const userGroups = allGroups.filter(group => 
        userGroupIds.includes(group.group_id) && group.status === 'active'
      )

      console.log('[GROUPS] Found groups for user:', userGroups.length)
      console.log('[GROUPS] Groups:', userGroups.map(g => ({ id: g.group_id, name: g.name })))
      return userGroups
    } catch (error) {
      console.error('[GROUPS] Error getting user groups:', error)
      throw new Error('Failed to get user groups')
    }
  }

  // Get group members
  async getGroupMembers(groupId: string, userEmail: string): Promise<GroupMember[]> {
    try {
      console.log('[GROUPS] Getting members for group:', groupId)

      // Verify user has access to this group
      const userGroups = await this.getUserGroups(userEmail)
      const hasAccess = userGroups.some(group => group.group_id === groupId)
      
      if (!hasAccess) {
        throw new Error('Access denied to group')
      }

      const authService = await this.getAuthService()
      const sheets = await this.getSheetsService()

      const range = 'Group_Members!A:F'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range
      })

      const rows = response.data.values || []
      if (rows.length <= 1) {
        return []
      }

      const headers = rows[0]
      const groupMemberIdIndex = headers.indexOf('group_member_id')
      const groupIdIndex = headers.indexOf('group_id')
      const userEmailIndex = headers.indexOf('user_email')
      const roleIndex = headers.indexOf('role')
      const joinedAtIndex = headers.indexOf('joined_at')
      const statusIndex = headers.indexOf('status')

      const members = rows.slice(1)
        .filter((row: any[]) => row[groupIdIndex] === groupId)
        .map((row: any[]) => ({
          group_member_id: row[groupMemberIdIndex] || '',
          group_id: row[groupIdIndex] || '',
          user_email: row[userEmailIndex] || '',
          role: (row[roleIndex] as 'owner' | 'admin' | 'member') || 'member',
          joined_at: row[joinedAtIndex] || '',
          status: (row[statusIndex] as 'active' | 'inactive') || 'active'
        }))
        .filter(member => member.status === 'active')

      console.log('[GROUPS] Found group members:', members.length)
      return members
    } catch (error) {
      console.error('[GROUPS] Error getting group members:', error)
      throw new Error('Failed to get group members')
    }
  }

  // Add member to group
  async addGroupMember(requesterEmail: string, groupId: string, userEmail: string, role: 'admin' | 'member'): Promise<GroupMember> {
    try {
      console.log('[GROUPS] Adding member to group:', { groupId, userEmail, role })

      // Verify requester has admin access to group
      const userGroups = await this.getUserGroups(requesterEmail)
      const group = userGroups.find(g => g.group_id === groupId)
      
      if (!group) {
        throw new Error('Group not found or access denied')
      }

      // Check if requester is owner or admin
      const members = await this.getGroupMembers(groupId, requesterEmail)
      const requesterMember = members.find(m => m.user_email === requesterEmail)
      
      if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
        throw new Error('Insufficient permissions to add members')
      }

      const authService = await this.getAuthService()
      const sheets = await this.getSheetsService()

      const memberId = `GM${Date.now()}${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const newMember: GroupMember = {
        group_member_id: memberId,
        group_id: groupId,
        user_email: userEmail,
        role,
        joined_at: now,
        status: 'active'
      }

      const range = 'Group_Members!A:F'
      const values = [[
        newMember.group_member_id,
        newMember.group_id,
        newMember.user_email,
        newMember.role,
        newMember.joined_at,
        newMember.status
      ]]

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.env.SHEET_ID,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: [values[0]] }
      })

      console.log('[GROUPS] Member added successfully:', memberId)
      return newMember
    } catch (error) {
      console.error('[GROUPS] Error adding group member:', error)
      throw new Error('Failed to add group member')
    }
  }

  // Remove member from group
  async removeGroupMember(requesterEmail: string, groupId: string, userEmail: string): Promise<void> {
    try {
      console.log('[GROUPS] Removing member from group:', { groupId, userEmail })

      // Verify requester has admin access to group
      const userGroups = await this.getUserGroups(requesterEmail)
      const group = userGroups.find(g => g.group_id === groupId)
      
      if (!group) {
        throw new Error('Group not found or access denied')
      }

      // Check if requester is owner or admin
      const members = await this.getGroupMembers(groupId, requesterEmail)
      const requesterMember = members.find(m => m.user_email === requesterEmail)
      
      if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
        throw new Error('Insufficient permissions to remove members')
      }

      // Cannot remove owner
      if (group.owner_email === userEmail) {
        throw new Error('Cannot remove group owner')
      }

      const authService = await this.getAuthService()
      const sheets = await this.getSheetsService()

      // Find member row
      const range = 'Group_Members!A:F'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range
      })

      const rows = response.data.values || []
      const headers = rows[0]
      const groupIdIndex = headers.indexOf('group_id')
      const userEmailIndex = headers.indexOf('user_email')

      const memberRowIndex = rows.findIndex((row: any[], index: number) => 
        index > 0 && row[groupIdIndex] === groupId && row[userEmailIndex] === userEmail
      )

      if (memberRowIndex === -1) {
        throw new Error('Member not found in group')
      }

      // Update member status to inactive
      const updateRange = `Group_Members!F${memberRowIndex + 1}`
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.env.SHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values: [['inactive']] }
      })

      console.log('[GROUPS] Member removed successfully')
    } catch (error) {
      console.error('[GROUPS] Error removing group member:', error)
      throw new Error('Failed to remove group member')
    }
  }

  // Update group
  async updateGroup(userEmail: string, groupId: string, updates: UpdateGroupData): Promise<Group> {
    try {
      console.log('[GROUPS] Updating group:', { groupId, updates })

      // Verify user has admin access to group
      const userGroups = await this.getUserGroups(userEmail)
      const group = userGroups.find(g => g.group_id === groupId)
      
      if (!group) {
        throw new Error('Group not found or access denied')
      }

      // Check if user is owner or admin
      const members = await this.getGroupMembers(groupId, userEmail)
      const userMember = members.find(m => m.user_email === userEmail)
      
      if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'admin')) {
        throw new Error('Insufficient permissions to update group')
      }

      const authService = await this.getAuthService()
      const sheets = await this.getSheetsService()

      // Find group row
      const range = 'Groups!A:G'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range
      })

      const rows = response.data.values || []
      const headers = rows[0]
      const groupIdIndex = headers.indexOf('group_id')

      const groupRowIndex = rows.findIndex((row: any[], index: number) => 
        index > 0 && row[groupIdIndex] === groupId
      )

      if (groupRowIndex === -1) {
        throw new Error('Group not found')
      }

      // Update group
      const updatedGroup: Group = {
        ...group,
        ...updates,
        updated_at: new Date().toISOString()
      }

      const updateRange = `Groups!A${groupRowIndex + 1}:G${groupRowIndex + 1}`
      const values = [[
        updatedGroup.group_id,
        updatedGroup.name,
        updatedGroup.description,
        updatedGroup.owner_email,
        updatedGroup.created_at,
        updatedGroup.updated_at,
        updatedGroup.status
      ]]

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.env.SHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values: [values[0]] }
      })

      console.log('[GROUPS] Group updated successfully')
      return updatedGroup
    } catch (error) {
      console.error('[GROUPS] Error updating group:', error)
      throw new Error('Failed to update group')
    }
  }

  // Delete group
  async deleteGroup(userEmail: string, groupId: string): Promise<void> {
    try {
      console.log('[GROUPS] Deleting group:', groupId)

      // Verify user is owner of group
      const userGroups = await this.getUserGroups(userEmail)
      const group = userGroups.find(g => g.group_id === groupId)
      
      if (!group) {
        throw new Error('Group not found or access denied')
      }

      if (group.owner_email !== userEmail) {
        throw new Error('Only group owner can delete group')
      }

      const authService = await this.getAuthService()
      const sheets = await this.getSheetsService()

      // Find group row
      const range = 'Groups!A:G'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range
      })

      const rows = response.data.values || []
      const headers = rows[0]
      const groupIdIndex = headers.indexOf('group_id')

      const groupRowIndex = rows.findIndex((row: any[], index: number) => 
        index > 0 && row[groupIdIndex] === groupId
      )

      if (groupRowIndex === -1) {
        throw new Error('Group not found')
      }

      // Mark group as inactive
      const updateRange = `Groups!G${groupRowIndex + 1}`
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.env.SHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values: [['inactive']] }
      })

      // Mark all group members as inactive
      const membersRange = 'Group_Members!A:F'
      const membersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range: membersRange
      })

      const membersRows = membersResponse.data.values || []
      const membersHeaders = membersRows[0]
      const memberGroupIdIndex = membersHeaders.indexOf('group_id')
      const statusIndex = membersHeaders.indexOf('status')

      for (let i = 1; i < membersRows.length; i++) {
        if (membersRows[i][memberGroupIdIndex] === groupId) {
          const memberStatusRange = `Group_Members!F${i + 1}`
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.env.SHEET_ID,
            range: memberStatusRange,
            valueInputOption: 'RAW',
            requestBody: { values: [['inactive']] }
          })
        }
      }

      console.log('[GROUPS] Group deleted successfully')
    } catch (error) {
      console.error('[GROUPS] Error deleting group:', error)
      throw new Error('Failed to delete group')
    }
  }

  // Check if user has access to group
  async hasGroupAccess(userEmail: string, groupId: string): Promise<boolean> {
    try {
      console.log('[GROUPS] Checking access for user:', userEmail, 'to group:', groupId)
      const userGroups = await this.getUserGroups(userEmail)
      console.log('[GROUPS] User groups:', userGroups.map(g => ({ id: g.group_id, name: g.name })))
      const hasAccess = userGroups.some(group => group.group_id === groupId)
      console.log('[GROUPS] Access result:', hasAccess)
      return hasAccess
    } catch (error) {
      console.error('[GROUPS] Error checking group access:', error)
      return false
    }
  }

  // Get user's default group (personal group)
  async getDefaultGroup(userEmail: string): Promise<Group | null> {
    try {
      const userGroups = await this.getUserGroups(userEmail)
      // Return the first group (should be personal group created during user registration)
      return userGroups.length > 0 ? userGroups[0] : null
    } catch (error) {
      console.error('[GROUPS] Error getting default group:', error)
      return null
    }
  }
}
