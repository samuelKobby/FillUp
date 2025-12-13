import { supabase } from './supabase'

export const uploadStationImage = async (
  file: File,
  stationId: string
): Promise<string> => {
  try {
    console.log('uploadStationImage called:', { fileName: file.name, fileSize: file.size, stationId })
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${stationId}-${Date.now()}.${fileExt}`
    const filePath = `stations/${fileName}`

    console.log('Uploading to path:', filePath)

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('station-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    console.log('Upload successful:', uploadData)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('station-images')
      .getPublicUrl(filePath)

    console.log('Public URL:', urlData.publicUrl)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export const updateStationImage = async (
  stationId: string,
  imageUrl: string
): Promise<void> => {
  try {
    console.log('updateStationImage called:', { stationId, imageUrl })
    
    const { error } = await supabase
      .from('stations')
      .update({ image_url: imageUrl })
      .eq('id', stationId)

    if (error) {
      console.error('Update error:', error)
      throw error
    }
    
    console.log('Station image URL updated successfully')
  } catch (error) {
    console.error('Error updating station image:', error)
    throw error
  }
}

export const deleteStationImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/station-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('station-images')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}

// Customer profile image functions
export const uploadCustomerImage = async (
  file: File,
  userId: string
): Promise<string> => {
  try {
    console.log('uploadCustomerImage called:', { fileName: file.name, fileSize: file.size, userId })
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `customers/${fileName}`

    console.log('Uploading to path:', filePath)

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    console.log('Upload successful:', uploadData)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    console.log('Public URL:', urlData.publicUrl)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading customer image:', error)
    throw error
  }
}

export const updateCustomerImage = async (
  userId: string,
  imageUrl: string
): Promise<void> => {
  try {
    console.log('updateCustomerImage called:', { userId, imageUrl })
    
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: imageUrl })
      .eq('id', userId)

    if (error) {
      console.error('Update error:', error)
      throw error
    }
    
    console.log('Customer image URL updated successfully')
  } catch (error) {
    console.error('Error updating customer image:', error)
    throw error
  }
}

export const deleteCustomerImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/profile-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error deleting customer image:', error)
    throw error
  }
}

// Vehicle image functions
export const uploadVehicleImage = async (
  file: File,
  vehicleId: string,
  userId: string
): Promise<string> => {
  try {
    console.log('uploadVehicleImage called:', { fileName: file.name, fileSize: file.size, vehicleId, userId })
    
    // Generate unique filename with user ID in path
    const fileExt = file.name.split('.').pop()
    const fileName = `${vehicleId}-${Date.now()}.${fileExt}`
    const filePath = `${userId}/vehicles/${fileName}`

    console.log('Uploading to path:', filePath)

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    console.log('Upload successful:', uploadData)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    console.log('Public URL:', urlData.publicUrl)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading vehicle image:', error)
    throw error
  }
}

export const updateVehicleImage = async (
  vehicleId: string,
  imageUrl: string
): Promise<void> => {
  try {
    console.log('updateVehicleImage called:', { vehicleId, imageUrl })
    
    const { error } = await supabase
      .from('vehicles')
      .update({ image_url: imageUrl })
      .eq('id', vehicleId)

    if (error) {
      console.error('Update error:', error)
      throw error
    }
    
    console.log('Vehicle image URL updated successfully')
  } catch (error) {
    console.error('Error updating vehicle image:', error)
    throw error
  }
}

export const deleteVehicleImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/profile-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error deleting vehicle image:', error)
    throw error
  }
}

// Agent profile image functions
export const uploadAgentImage = async (
  file: File,
  userId: string
): Promise<string> => {
  try {
    console.log('uploadAgentImage called:', { fileName: file.name, fileSize: file.size, userId })
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `agents/${fileName}`

    console.log('Uploading to path:', filePath)

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    console.log('Upload successful:', uploadData)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    console.log('Public URL:', urlData.publicUrl)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading agent image:', error)
    throw error
  }
}

export const updateAgentImage = async (
  userId: string,
  imageUrl: string
): Promise<void> => {
  try {
    console.log('updateAgentImage called:', { userId, imageUrl })
    
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: imageUrl })
      .eq('id', userId)

    if (error) {
      console.error('Update error:', error)
      throw error
    }
    
    console.log('Agent image URL updated successfully')
  } catch (error) {
    console.error('Error updating agent image:', error)
    throw error
  }
}

export const deleteAgentImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/profile-images/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw error
    }
    
    console.log('Agent image deleted successfully')
  } catch (error) {
    console.error('Error deleting agent image:', error)
    throw error
  }
}
