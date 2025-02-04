import _ from 'lodash'
import React, { useCallback, useLayoutEffect, useRef } from 'react'
import { View, ViewStyle } from 'react-native'
import { useSpring } from 'react-spring/native'

import { constants, GitHubIcon } from '@devhub/core'
import { useHover } from '../../hooks/use-hover'
import { Platform } from '../../libs/platform'
import {
  columnHeaderItemContentSize,
  contentPadding,
} from '../../styles/variables'
import { getDefaultReactSpringAnimationConfig } from '../../utils/helpers/animations'
import { SpringAnimatedView } from '../animated/spring/SpringAnimatedView'
import { AccordionView } from '../common/AccordionView'
import { ConditionalWrap } from '../common/ConditionalWrap'
import { Spacer } from '../common/Spacer'
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '../common/TouchableOpacity'
import { useTheme } from '../context/ThemeContext'
import { ThemedText } from '../themed/ThemedText'
import { getColumnHeaderThemeColors } from './ColumnHeader'
import { ColumnHeaderItem } from './ColumnHeaderItem'

export interface ColumnOptionsRowProps {
  analyticsLabel: TouchableOpacityProps['analyticsLabel']
  children: React.ReactNode
  containerStyle?: ViewStyle
  contentContainerStyle?: ViewStyle
  disableBackground?: boolean
  enableBackgroundHover?: boolean
  hasChanged: boolean
  headerItemFixedIconSize?: number
  iconName: GitHubIcon
  forceImmediate?: boolean
  isOpen: boolean
  onToggle: (() => void) | undefined
  openOnHover?: boolean
  subtitle?: string
  title: string
}

export function ColumnOptionsRow(props: ColumnOptionsRowProps) {
  const {
    analyticsLabel,
    children,
    containerStyle,
    contentContainerStyle,
    enableBackgroundHover = true,
    hasChanged,
    headerItemFixedIconSize = columnHeaderItemContentSize,
    iconName,
    isOpen,
    onToggle,
    openOnHover,
    subtitle,
    title,
  } = props

  const getStyles = useCallback(
    ({ forceImmediate }: { forceImmediate?: boolean } = {}) => {
      const { isHovered, isPressing, theme } = cacheRef.current
      const immediate =
        constants.DISABLE_ANIMATIONS || forceImmediate || isHovered

      return {
        config: getDefaultReactSpringAnimationConfig(),
        immediate,
        backgroundColor:
          enableBackgroundHover && (isHovered || isPressing || isOpen)
            ? theme[getColumnHeaderThemeColors(theme.backgroundColor).hover]
            : theme[getColumnHeaderThemeColors(theme.backgroundColor).normal],
      }
    },
    [enableBackgroundHover, isOpen],
  )

  const updateStyles = useCallback(
    ({ forceImmediate }: { forceImmediate?: boolean }) => {
      setSpringAnimatedStyles(getStyles({ forceImmediate }))
    },
    [getStyles],
  )

  const initialTheme = useTheme(
    undefined,
    useCallback(
      theme => {
        if (cacheRef.current.theme === theme) return
        cacheRef.current.theme = theme
        updateStyles({ forceImmediate: true })
      },
      [updateStyles],
    ),
  )

  const touchableRef = useRef(null)
  const initialIsHovered = useHover(
    onToggle ? touchableRef : null,
    isHovered => {
      cacheRef.current.isHovered = isHovered
      updateStyles({ forceImmediate: false })

      if (openOnHover && onToggle && !isOpen) onToggle()
    },
  )

  const cacheRef = useRef({
    isHovered: initialIsHovered,
    isPressing: false,
    theme: initialTheme,
  })
  cacheRef.current.theme = initialTheme

  const [springAnimatedStyles, setSpringAnimatedStyles] = useSpring(getStyles)

  useLayoutEffect(() => {
    updateStyles({ forceImmediate: false })
  }, [updateStyles])

  return (
    <SpringAnimatedView
      style={{
        backgroundColor: springAnimatedStyles.backgroundColor,
        // borderWidth: 0,
        // borderColor: 'transparent',
        // borderBottomWidth: separatorSize,
        // borderBottomColor: springAnimatedTheme.backgroundColorLess1,
      }}
    >
      <ConditionalWrap
        condition={!!onToggle}
        wrap={child =>
          onToggle ? (
            <TouchableOpacity
              ref={touchableRef}
              activeOpacity={1}
              analyticsAction={isOpen ? 'hide' : 'show'}
              analyticsCategory="option_row"
              analyticsLabel={analyticsLabel}
              onPress={() => {
                onToggle()
              }}
              onPressIn={() => {
                if (Platform.realOS === 'web') return

                cacheRef.current.isPressing = true
                updateStyles({ forceImmediate: false })
              }}
              onPressOut={() => {
                if (Platform.realOS === 'web') return

                cacheRef.current.isPressing = false
                updateStyles({ forceImmediate: false })
              }}
            >
              {child}
            </TouchableOpacity>
          ) : (
            <View>{child}</View>
          )
        }
      >
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              alignContent: 'center',
              padding: contentPadding,
            },
            !!isOpen && !onToggle && { paddingBottom: contentPadding / 2 },
            containerStyle,
          ]}
        >
          <ColumnHeaderItem
            analyticsLabel={undefined}
            fixedIconSize
            iconName={iconName}
            iconStyle={{ lineHeight: 22 }}
            noPadding
            selectable={false}
            size={headerItemFixedIconSize}
            tooltip={undefined}
          />

          <Spacer width={contentPadding / 2} />

          <ThemedText
            color="foregroundColor"
            numberOfLines={1}
            style={{ fontWeight: '500' }}
          >
            {title}
          </ThemedText>

          <Spacer flex={1} minWidth={contentPadding / 2} />

          {!!(subtitle || hasChanged) && (
            <ThemedText
              color={
                !subtitle && hasChanged
                  ? 'primaryBackgroundColor'
                  : 'foregroundColorMuted60'
              }
              numberOfLines={1}
              style={{ fontSize: subtitle ? 12 : 10 }}
            >
              {subtitle || '●'}
            </ThemedText>
          )}

          {!!onToggle && (
            <>
              <Spacer width={contentPadding} />

              <ColumnHeaderItem
                analyticsLabel={undefined}
                iconName={isOpen ? 'chevron-up' : 'chevron-down'}
                iconStyle={{ lineHeight: undefined }}
                noPadding
                selectable={false}
                tooltip={undefined}
              />
            </>
          )}
        </View>
      </ConditionalWrap>

      <ConditionalWrap
        condition={!!onToggle}
        wrap={c => <AccordionView isOpen={isOpen}>{c}</AccordionView>}
      >
        <View
          style={[{ paddingBottom: contentPadding }, contentContainerStyle]}
        >
          {children}
        </View>
      </ConditionalWrap>
    </SpringAnimatedView>
  )
}
